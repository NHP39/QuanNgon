import { useEffect, useRef, useState } from "react";

const number = new Intl.NumberFormat("vi-VN");
const dayFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit" });

function formatOverviewDate(date) {
    return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

export function SeriesSummary({ data, unit, total: reportedTotal }) {
    const total = reportedTotal ?? data.reduce((sum, item) => sum + item.count, 0);
    return <div className="admin-chart-summary"><p><strong>{number.format(total)}</strong><span>{unit}</span></p>{data.length > 0 && <span className="admin-chart-range">{formatOverviewDate(data[0].date)} - {formatOverviewDate(data.at(-1).date)}</span>}</div>;
}

export function TimeSeriesChart({ data, label, variant = "line" }) {
    const container = useRef(null);
    const [width, setWidth] = useState(600);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
        observer.observe(container.current);
        return () => observer.disconnect();
    }, []);

    const left = 34, right = width - 14, top = 22, bottom = 182;
    const maximum = Math.max(4, Math.ceil(Math.max(0, ...data.map((item) => item.count)) / 4) * 4);
    const bar = variant === "bar";
    const slot = (right - left) / Math.max(1, data.length);
    const x = (index) => bar ? left + slot * (index + .5) : left + index * (right - left) / Math.max(1, data.length - 1);
    const y = (count) => bottom - count / maximum * (bottom - top);
    const points = data.map((item, index) => `${x(index)},${y(item.count)}`).join(" ");
    const tickStep = Math.max(1, Math.ceil((data.length - 1) / (width < 400 ? 3 : 6)));
    const labelWidth = 32;
    const ticks = [0];
    let lastLabelRight = x(0) + labelWidth;
    for (let index = tickStep; index < data.length - 1; index += tickStep) {
        const start = x(index) - labelWidth / 2;
        const end = x(index) + labelWidth / 2;
        if (start >= lastLabelRight + 8 && end <= x(data.length - 1) - labelWidth - 8) {
            ticks.push(index);
            lastLabelRight = end;
        }
    }
    if (data.length > 1) ticks.push(data.length - 1);

    return <div ref={container} className="admin-chart-surface">
        {data.length === 0 ? <p className="admin-chart-empty">Chưa có dữ liệu trong khoảng thời gian này.</p> : <svg className="admin-time-chart" viewBox={`0 0 ${width} 220`} role="img" aria-label={label}>
            {[0, 1, 2, 3, 4].map((index) => {
                const value = maximum * index / 4;
                return <g key={index}><line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="#e7edf4" /><text x={left - 8} y={y(value) + 4} textAnchor="end" fill="#70849d" fontSize="11">{number.format(value)}</text></g>;
            })}
            {!bar && <><polygon points={`${left},${bottom} ${points} ${x(data.length - 1)},${bottom}`} fill="#edf4ff" /><polyline points={points} fill="none" stroke="#2879df" strokeWidth="2.5" strokeLinejoin="round" /></>}
            {data.map((item, index) => <g key={item.date}>
                <title>{formatOverviewDate(item.date)}: {number.format(item.count)}</title>
                {bar ? <rect x={x(index) - Math.min(slot * .62, 60) / 2} y={y(item.count)} width={Math.min(slot * .62, 60)} height={bottom - y(item.count)} rx="2" fill="#3885e5" /> : <circle cx={x(index)} cy={y(item.count)} r={data.length > 30 ? 2 : 3.5} fill="#2879df" stroke="#fff" strokeWidth="1" />}
                {bar && data.length <= 12 && slot >= 26 && <text x={x(index)} y={y(item.count) - 7} textAnchor="middle" fill="#286ac1" fontSize="11" fontWeight="600">{number.format(item.count)}</text>}
                <rect x={bar ? left + index * slot : Math.max(left, x(index) - slot / 2)} y={top} width={slot} height={bottom - top} fill="transparent" />
            </g>)}
            {ticks.map((index) => <text key={data[index].date} x={x(index)} y="208" textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} fill="#70849d" fontSize="11">{formatOverviewDate(data[index].date)}</text>)}
        </svg>}
    </div>;
}

const statusItems = [
    { key: "PENDING", label: "Chờ duyệt", color: "#f5a137" },
    { key: "APPROVED", label: "Đã duyệt", color: "#18bc79" },
    { key: "REJECTED", label: "Từ chối", color: "#ed5762" },
    { key: "HIDDEN", label: "Đã ẩn", color: "#b8c5d5" }
];

export function StatusDonut({ counts, total: reportedTotal }) {
    const total = reportedTotal ?? statusItems.reduce((sum, item) => sum + counts[item.key], 0);
    let start = 0;
    const stops = statusItems.map((item) => {
        const end = start + (total ? counts[item.key] / total * 100 : 0);
        const stop = `${item.color} ${start}% ${end}%`;
        start = end;
        return stop;
    });
    return <div className="admin-donut-content">
        <div className="admin-donut" role="img" aria-label={`Tổng ${number.format(total)} quán ăn theo bốn trạng thái`} style={{ background: total ? `conic-gradient(${stops.join(", ")})` : "#e8eef5" }}><div><strong>{number.format(total)}</strong><span>Tổng quán</span></div></div>
        <dl className="admin-donut-legend">{statusItems.map((item) => <div key={item.key}><dt><i style={{ backgroundColor: item.color }} />{item.label}</dt><dd><strong>{number.format(counts[item.key])}</strong><small>{total ? (counts[item.key] / total * 100).toFixed(1) : "0.0"}%</small></dd></div>)}</dl>
    </div>;
}
