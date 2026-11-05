import { Camera, Star, Utensils, UsersRound } from "lucide-react";

const criteria = [
    { key: "foodQuantity", label: "Chất lượng món ăn", icon: Utensils },
    { key: "serviceQuantity", label: "Dịch vụ phục vụ", icon: UsersRound },
    { key: "space", label: "Không gian quán", icon: Camera },
    { key: "cleanliness", label: "Vệ sinh", icon: Star }
];

export function RatingStars({ score }) {
    return <span className="detail-stars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={index < Math.round(score) ? "is-filled" : ""} />)}</span>;
}

export function RatingCriteriaRows({ scores, compact = false }) {
    return <div className={`detail-score-rows${compact ? " is-compact" : ""}`}>
        {criteria.map(({ key, label, icon: Icon }) => <div className="detail-score-row" key={key}>
            <Icon aria-hidden="true" /><span>{label}</span>
            <div className="detail-score-track" role="meter" aria-label={label} aria-valuemin="0" aria-valuemax="5" aria-valuenow={scores[key]}><span style={{ width: `${scores[key] * 20}%` }} /></div>
            <strong>{scores[key].toFixed(1)}</strong>
        </div>)}
    </div>;
}
