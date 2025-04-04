import React, { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface Tag {
  id: string;
  text: string;
}

interface TagInputProps {
  tags: Tag[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tagId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

export function TagInput({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = "Add tag...",
  disabled = false,
  maxTags = Infinity,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (
      trimmedTag !== "" && 
      !tags.some((t) => t.text.toLowerCase() === trimmedTag.toLowerCase()) &&
      tags.length < maxTags
    ) {
      onAddTag(trimmedTag);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      e.preventDefault();
      onRemoveTag(tags[tags.length - 1].id);
    }
  };

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div 
      className={`flex flex-wrap gap-2 p-2 border border-input rounded-md min-h-[40px] ${disabled ? "bg-muted" : "bg-background"}`}
      onClick={handleContainerClick}
      ref={containerRef}
    >
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        >
          {tag.text}
          {!disabled && (
            <button
              type="button"
              className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
              onClick={() => onRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={tags.length < maxTags ? placeholder : ""}
        className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-7 text-sm"
        disabled={disabled || tags.length >= maxTags}
      />
    </div>
  );
}
