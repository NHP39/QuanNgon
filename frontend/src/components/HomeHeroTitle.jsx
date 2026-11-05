import { useEffect, useState } from "react";

const INTRO = Array.from("Bạn muốn tìm kiếm ");
const EMPHASIS = Array.from("Quán ăn");
const ENDING = Array.from(" ngon?");
const TITLE_LENGTH = INTRO.length + EMPHASIS.length + ENDING.length;
const FULL_TITLE = [...INTRO, ...EMPHASIS, ...ENDING].join("");
const FADE_DURATION_MS = 650;

export function HomeHeroTitle() {
    const [visibleCount, setVisibleCount] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
        let timer;

        function start() {
            window.clearTimeout(timer);
            setIsFading(false);
            if (motionPreference.matches) {
                setVisibleCount(TITLE_LENGTH);
                return;
            }

            let count = 0;
            setVisibleCount(0);

            function typeNextCharacter() {
                count += 1;
                setVisibleCount(count);
                timer = window.setTimeout(count === TITLE_LENGTH ? fadeOut : typeNextCharacter, count === TITLE_LENGTH ? 1500 : 75);
            }

            function fadeOut() {
                setIsFading(true);
                timer = window.setTimeout(resetCycle, FADE_DURATION_MS);
            }

            function resetCycle() {
                count = 0;
                setVisibleCount(0);
                timer = window.setTimeout(() => {
                    setIsFading(false);
                    timer = window.setTimeout(typeNextCharacter, 75);
                }, 450);
            }

            timer = window.setTimeout(typeNextCharacter, 250);
        }

        start();
        motionPreference.addEventListener("change", start);
        return () => {
            window.clearTimeout(timer);
            motionPreference.removeEventListener("change", start);
        };
    }, []);

    function renderCharacters(characters, offset) {
        return characters.map((character, index) => {
            const position = offset + index;
            const className = `home-title-character${position < visibleCount ? " is-visible" : ""}${position === visibleCount - 1 ? " is-cursor" : ""}`;
            return <span key={position} className={className}>{character}</span>;
        });
    }

    return <h1 id="home-title" aria-label={FULL_TITLE}>
        <span className={`home-title-text${isFading ? " is-fading" : ""}`} style={{ "--title-fade-duration": `${FADE_DURATION_MS}ms` }} aria-hidden="true">
            {renderCharacters(INTRO, 0)}
            <em>{renderCharacters(EMPHASIS, INTRO.length)}</em>
            {renderCharacters(ENDING, INTRO.length + EMPHASIS.length)}
        </span>
    </h1>;
}
