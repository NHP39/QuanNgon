import { useEffect, useId, useRef, useState } from "react";
import { getProvinces, getWards } from "../services/provinceService";
import { normalizeSearch } from "../utils/text";
import { AddressSelect } from "./AddressSelect";
import "./AddressFields.css";

function addressNameKey(name) {
    return normalizeSearch(name).trim().replace(/\s+/g, " ");
}

function findProvince(provinces, name) {
    const key = addressNameKey(name);
    const exact = provinces.find((province) => addressNameKey(province.name) === key);
    if (exact) return exact;
    const withoutPrefix = (value) => addressNameKey(value).replace(/^(?:thanh pho|tinh|tp\.?)\s+|^tp\./, "");
    const matches = provinces.filter((province) => withoutPrefix(province.name) === withoutPrefix(name));
    return matches.length === 1 ? matches[0] : null;
}

export function AddressFields({ value, onChange, disabled = false }) {
    const id = useId();
    const [initialAddress] = useState(() => ({ province: value.province, ward: value.ward }));
    const initialSelection = useRef(true);
    const [manual, setManual] = useState(false);
    const [provinces, setProvinces] = useState(null);
    const [provinceCode, setProvinceCode] = useState("");
    const [wardResult, setWardResult] = useState({ provinceCode: "", items: [] });
    const wardLoading = Boolean(provinceCode && wardResult.provinceCode !== provinceCode);
    const wards = wardResult.provinceCode === provinceCode ? wardResult.items : [];

    useEffect(() => {
        if (manual) return undefined;
        const controller = new AbortController();
        getProvinces({ signal: controller.signal }).then((items) => {
            if (controller.signal.aborted) return;
            if (initialAddress.province) {
                const matched = findProvince(items, initialAddress.province);
                if (!matched) { setManual(true); return; }
                setProvinceCode(matched.code);
            } else if (initialAddress.ward) { setManual(true); return; }
            setProvinces(items);
        }).catch(() => {
            if (!controller.signal.aborted) setManual(true);
        });
        return () => controller.abort();
    }, [manual, initialAddress]);

    useEffect(() => {
        if (manual || !provinceCode) return undefined;
        const controller = new AbortController();
        getWards(provinceCode, { signal: controller.signal }).then((items) => {
            if (controller.signal.aborted) return;
            if (initialSelection.current && initialAddress.ward
                && !items.some((item) => addressNameKey(item.name) === addressNameKey(initialAddress.ward))) {
                setManual(true);
                return;
            }
            setWardResult({ provinceCode, items });
        }).catch(() => {
            if (!controller.signal.aborted) setManual(true);
        });
        return () => controller.abort();
    }, [manual, provinceCode, initialAddress]);

    function selectProvince(code) {
        if (code === provinceCode) return;
        initialSelection.current = false;
        setProvinceCode(code);
        onChange({ province: provinces.find((item) => item.code === code)?.name || "", ward: "" });
    }

    return <div className="address-fields">
        <div className="address-field"><label id={`${id}-province-label`} htmlFor={`${id}-province`}>Tỉnh/Thành phố <b>*</b></label>
            {manual ? <input id={`${id}-province`} name="province" value={value.province} autoComplete="address-level1" maxLength={255} required disabled={disabled}
                placeholder="Nhập tỉnh/thành phố" onChange={(event) => onChange({ province: event.target.value })} />
                : <AddressSelect id={`${id}-province`} labelledBy={`${id}-province-label`} name="province" value={provinceCode}
                    options={(provinces || []).map((item) => ({ value: item.code, label: item.name }))}
                    placeholder={provinces === null ? "Đang tải tỉnh/thành phố..." : "Chọn tỉnh/thành phố"}
                    disabled={disabled || provinces === null} onChange={selectProvince} />}
        </div>
        <div className="address-field"><label id={`${id}-ward-label`} htmlFor={`${id}-ward`}>Phường/Xã <b>*</b></label>
            {manual ? <input id={`${id}-ward`} name="ward" value={value.ward} autoComplete="address-level2" maxLength={255} required disabled={disabled}
                placeholder="Nhập phường/xã" onChange={(event) => onChange({ ward: event.target.value })} />
                : <AddressSelect id={`${id}-ward`} labelledBy={`${id}-ward-label`} name="ward"
                    value={wards.find((item) => addressNameKey(item.name) === addressNameKey(value.ward))?.name || value.ward}
                    options={wards.map((item) => ({ value: item.name, label: item.name }))}
                    placeholder={!provinceCode ? "Chọn tỉnh/thành phố trước" : wardLoading ? "Đang tải phường/xã..." : "Chọn phường/xã"}
                    disabled={disabled || !provinceCode || wardLoading} onChange={(ward) => onChange({ ward })} />}
        </div>
        <div className="address-field"><label htmlFor={`${id}-street`}>Số nhà, tên đường <b>*</b></label>
            <input id={`${id}-street`} name="street" value={value.street} autoComplete="address-line1" maxLength={255} required disabled={disabled}
                placeholder="Nhập số nhà, tên đường" onChange={(event) => onChange({ street: event.target.value })} />
        </div>
    </div>;
}
