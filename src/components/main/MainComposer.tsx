"use client";

import { type RefObject, type KeyboardEvent } from "react";
import Image from "next/image";
import { assets } from "@/src/assets/assets";

interface MainComposerProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  placeholder: string;
  disclaimer: string;
  disabled: boolean;
  gated: boolean;
  canSend: boolean;
}

export function MainComposer({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  placeholder,
  disclaimer,
  disabled,
  gated,
  canSend,
}: MainComposerProps) {
  return (
    <div className={`input-container ${gated ? "input-gated" : ""}`}>
      <div className="input-wrapper">
        <input
          type="text"
          className="message-input"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled || gated}
          aria-label={placeholder}
        />
        <div className="input-actions">
          <button
            type="button"
            className="send-button"
            onClick={onSend}
            disabled={!canSend || disabled || gated}
            aria-label="Send"
          >
            <Image src={assets.send_icon} alt="" width={20} height={20} />
          </button>
        </div>
      </div>
      {!gated && <p className="input-disclaimer">{disclaimer}</p>}
    </div>
  );
}
