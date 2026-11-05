import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { normalizeSearch } from "../utils/text";

export function AddressSelect({ id, name, labelledBy, value, options, placeholder, disabled, onChange }) {
    const root = useRef(null);
    const trigger = useRef(null);
    const list = useRef(null);
    const search = useRef({ value: "", time: 0 });
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const selectedIndex = options.findIndex((option) => option.value === value);
    const selected = options[selectedIndex];
    const isOpen = open && !disabled && options.length > 0;
    const listId = `${id}-options`;

    useEffect(() => {
        if (!isOpen) return undefined;
        function closeOutside(event) {
            if (!root.current?.contains(event.target)) setOpen(false);
        }
        document.addEventListener("pointerdown", closeOutside);
        list.current?.scrollIntoView({ block: "nearest" });
        return () => document.removeEventListener("pointerdown", closeOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }, [isOpen, activeIndex]);

    function openList(index = selectedIndex >= 0 ? selectedIndex : 0) {
        if (disabled || options.length === 0) return;
        setActiveIndex(index);
        setOpen(true);
    }

    function select(index) {
        if (!options[index]) return;
        onChange(options[index].value);
        setOpen(false);
        search.current = { value: "", time: 0 };
        trigger.current?.focus({ preventScroll: true });
    }

    function onKeyDown(event) {
        if (event.key === "Tab") { setOpen(false); return; }
        if (event.key === "Escape") {
            if (isOpen) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (isOpen) select(activeIndex); else openList();
            return;
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (event.key === "Home") openList(0);
            else if (event.key === "End") openList(options.length - 1);
            else if (!isOpen) openList(selectedIndex >= 0 ? selectedIndex : event.key === "ArrowUp" ? options.length - 1 : 0);
            else setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
            return;
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            const query = normalizeSearch((now - search.current.time < 700 ? search.current.value : "") + event.key);
            search.current = { value: query, time: now };
            const index = options.findIndex((option) => normalizeSearch(option.label).startsWith(query));
            if (index >= 0) { event.preventDefault(); openList(index); }
        }
    }

    return <div className="address-select" ref={root} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
        <button ref={trigger} id={id} name={name} value={value} type="button" role="combobox"
            className={`address-select-trigger${selected ? "" : " is-placeholder"}`} disabled={disabled}
            aria-labelledby={labelledBy} aria-haspopup="listbox" aria-expanded={isOpen} aria-required="true"
            aria-controls={isOpen ? listId : undefined} aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined}
            onClick={() => isOpen ? setOpen(false) : openList()} onKeyDown={onKeyDown}>
            <span>{selected?.label || placeholder}</span><ChevronDown aria-hidden="true" />
        </button>
        {isOpen && <ul ref={list} id={listId} className="address-select-options" role="listbox" aria-labelledby={labelledBy}>
            {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option"
                aria-selected={option.value === value} className={`address-select-option${index === activeIndex ? " is-active" : ""}`}
                onPointerMove={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => select(index)}>
                {option.label}
            </li>)}
        </ul>}
    </div>;
}
