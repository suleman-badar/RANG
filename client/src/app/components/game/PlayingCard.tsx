import React from "react";
import { Card, Suit } from "../../context/GameContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSuitSymbol(suit: Suit | string): string {
  switch (suit) {
    case "H": return "♥";
    case "D": return "♦";
    case "C": return "♣";
    case "S": return "♠";
    default: return suit;
  }
}

export function getSuitName(suit: Suit | string): string {
  switch (suit) {
    case "H": return "Hearts";
    case "D": return "Diamonds";
    case "C": return "Clubs";
    case "S": return "Spades";
    default: return suit;
  }
}

export function isRedSuit(suit: string): boolean {
  return suit === "H" || suit === "D";
}

export function getValueLabel(value: number): string {
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  if (value === 14) return "A";
  return String(value);
}

// ─── Card Face ────────────────────────────────────────────────────────────────

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  playable?: boolean;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  className?: string;
}

export function PlayingCard({
  card,
  onClick,
  selected = false,
  playable = false,
  size = "md",
  faceDown = false,
  className = "",
}: PlayingCardProps) {
  const red = isRedSuit(card.suit);
  const label = getValueLabel(card.value);
  const suit = getSuitSymbol(card.suit);

  const sizeClasses = {
    sm: "w-10 h-14 text-xs",
    md: "w-14 h-20 text-sm",
    lg: "w-16 h-24 text-base",
  };

  const baseClasses = `
    relative rounded-lg border-2 select-none flex flex-col justify-between p-1
    ${sizeClasses[size]}
    ${faceDown
      ? "bg-blue-900 border-blue-700 cursor-default"
      : "bg-white border-gray-200"
    }
    ${!faceDown && playable && !selected
      ? "cursor-pointer border-yellow-400 hover:border-yellow-300 hover:-translate-y-2 shadow-lg hover:shadow-yellow-400/40"
      : ""
    }
    ${!faceDown && selected
      ? "cursor-pointer border-yellow-300 -translate-y-3 shadow-xl shadow-yellow-400/50 ring-2 ring-yellow-300"
      : ""
    }
    ${!faceDown && !playable && !selected && onClick
      ? "cursor-pointer hover:-translate-y-1"
      : ""
    }
    ${!faceDown && !playable && !onClick
      ? "cursor-default"
      : ""
    }
    transition-all duration-150
    ${className}
  `;

  if (faceDown) {
    return (
      <div className={baseClasses}>
        <div className="absolute inset-1 rounded bg-blue-800 opacity-50 flex items-center justify-center">
          <span className="text-blue-400 text-lg">🂠</span>
        </div>
      </div>
    );
  }

  const textColor = red ? "text-red-600" : "text-slate-900";

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      title={`${label}${suit}`}
    >
      {/* Top-left */}
      <div className={`leading-none ${textColor}`}>
        <div className="font-bold">{label}</div>
        <div>{suit}</div>
      </div>
      {/* Center suit */}
      <div className={`absolute inset-0 flex items-center justify-center text-2xl ${textColor} opacity-20`}>
        {suit}
      </div>
      {/* Bottom-right (rotated) */}
      <div className={`leading-none self-end rotate-180 ${textColor}`}>
        <div className="font-bold">{label}</div>
        <div>{suit}</div>
      </div>
    </div>
  );
}

// ─── Face-Down Card ───────────────────────────────────────────────────────────

interface CardBackProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CardBack({ size = "md", className = "" }: CardBackProps) {
  const sizeClasses = {
    sm: "w-10 h-14",
    md: "w-14 h-20",
    lg: "w-16 h-24",
  };

  return (
    <div
      className={`
        rounded-lg border-2 border-blue-700 bg-blue-900 
        ${sizeClasses[size]} flex items-center justify-center
        ${className}
      `}
    >
      <div className="w-4/5 h-4/5 rounded border border-blue-600 bg-blue-800 flex items-center justify-center">
        <span className="text-blue-500 text-xs">🂠</span>
      </div>
    </div>
  );
}

// ─── Suit Selector ────────────────────────────────────────────────────────────

interface SuitSelectorProps {
  onSelect: (suit: Suit) => void;
  title?: string;
}

export function SuitSelector({ onSelect, title = "Select Trump Suit" }: SuitSelectorProps) {
  const suits: Suit[] = ["H", "D", "C", "S"];

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 shadow-2xl">
      <p className="text-white text-center mb-3 text-sm font-medium">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {suits.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg
              border-2 transition-all duration-150
              ${isRedSuit(s)
                ? "border-red-600 bg-red-950 hover:bg-red-900 text-red-400 hover:text-red-300"
                : "border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
              }
            `}
          >
            <span className="text-2xl">{getSuitSymbol(s)}</span>
            <span className="text-xs mt-1">{getSuitName(s)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
