"use client";

import { useState, useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { createGame } from "@/app/lib/chess";
import type { Move, Square as ChessSquare } from "@/app/lib/chess/types";

// Local type for square notation
type Square = string;

interface ChessBoardProps {
  fen: string;
  onMove?: (move: Move) => void;
  orientation?: "white" | "black";
  interactive?: boolean;
  showLegalMoves?: boolean;
  lastMove?: { from: string; to: string } | null;
  bestMove?: { from: string; to: string } | null;
  arrows?: Array<[string, string, string?]>;
}

export function ChessBoard({
  fen,
  onMove,
  orientation = "white",
  interactive = true,
  showLegalMoves = true,
  lastMove,
  bestMove,
  arrows = [],
}: ChessBoardProps) {
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  // Create game instance for move validation
  const game = useMemo(() => createGame(fen), [fen]);

  // Custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight last move
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: "rgba(247, 236, 89, 0.4)",
      };
      styles[lastMove.to] = {
        backgroundColor: "rgba(247, 236, 89, 0.4)",
      };
    }

    // Highlight selected square
    if (moveFrom) {
      styles[moveFrom] = {
        backgroundColor: "rgba(74, 144, 217, 0.4)",
      };
    }

    // Show legal move indicators
    if (showLegalMoves && legalMoves.length > 0) {
      legalMoves.forEach((square) => {
        const piece = game.get(square as ChessSquare);
        styles[square] = {
          backgroundImage: piece
            ? "radial-gradient(circle, rgba(0,0,0,0.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,0.1) 25%, transparent 25%)",
          ...styles[square],
        };
      });
    }

    return styles;
  }, [lastMove, moveFrom, legalMoves, showLegalMoves, game]);

  // Custom arrows (for best move indicator)
  const customArrows = useMemo(() => {
    const result: Array<{ startSquare: string; endSquare: string; color: string }> = [];

    // Add best move arrow
    if (bestMove) {
      result.push({
        startSquare: bestMove.from,
        endSquare: bestMove.to,
        color: "rgba(164, 117, 240, 0.7)", // Purple for engine suggestion
      });
    }

    // Add any additional arrows
    arrows.forEach(([from, to, color]) => {
      result.push({
        startSquare: from,
        endSquare: to,
        color: color || "rgba(255, 170, 0, 0.7)",
      });
    });

    return result;
  }, [bestMove, arrows]);

  // Handle square click
  const handleSquareClick = useCallback(
    ({ square }: { piece: { pieceType: string } | null; square: string }) => {
      if (!interactive) return;

      // If we have a piece selected
      if (moveFrom) {
        // Try to make the move
        if (legalMoves.includes(square)) {
          const move = game.move({ from: moveFrom, to: square });
          if (move && onMove) {
            onMove(move);
          }
        }
        // Clear selection
        setMoveFrom(null);
        setLegalMoves([]);
        return;
      }

      // Select a piece
      const piece = game.get(square as ChessSquare);
      if (piece && piece.color === game.turn()) {
        setMoveFrom(square);
        const moves = game.getLegalMovesForSquare(square as ChessSquare);
        setLegalMoves(moves.map((m) => m.to as Square));
      }
    },
    [interactive, moveFrom, legalMoves, game, onMove]
  );

  // Handle drag and drop
  const handlePieceDrop = useCallback(
    ({
      piece,
      sourceSquare,
      targetSquare,
    }: {
      piece: { isSparePiece: boolean; position: string; pieceType: string };
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      if (!interactive || !targetSquare) return false;

      // Check if it's a promotion
      const pieceType = piece.pieceType;
      const isWhitePawn = pieceType === "P";
      const isBlackPawn = pieceType === "p";
      const isPromotion =
        (isWhitePawn && targetSquare[1] === "8") ||
        (isBlackPawn && targetSquare[1] === "1");

      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? "q" : undefined,
      });

      if (move && onMove) {
        onMove(move);
        return true;
      }

      return false;
    },
    [interactive, game, onMove]
  );

  // Handle piece drag
  const handlePieceDrag = useCallback(
    ({
      square,
    }: {
      isSparePiece: boolean;
      piece: { pieceType: string };
      square: string | null;
    }) => {
      if (!interactive || !square) return;

      const moves = game.getLegalMovesForSquare(square as ChessSquare);
      setLegalMoves(moves.map((m) => m.to as Square));
      setMoveFrom(square);
    },
    [interactive, game]
  );

  return (
    <div
      className="relative aspect-square w-full"
      style={{ viewTransitionName: "chess-board" }}
    >
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          onSquareClick: handleSquareClick,
          onPieceDrop: handlePieceDrop,
          onPieceDrag: handlePieceDrag,
          squareStyles: customSquareStyles,
          arrows: customArrows,
          boardStyle: {
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
          },
          darkSquareStyle: {
            backgroundColor: "#A67B5B",
          },
          lightSquareStyle: {
            backgroundColor: "#E8D5B5",
          },
          allowDrawingArrows: true,
          allowDragging: interactive,
        }}
      />
    </div>
  );
}
