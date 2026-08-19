import { useEffect, useState } from 'react';
import { fetchCouponTypes } from '../../../api/admin.js';
import { ErrorState } from '../../../shared/components/AsyncState.jsx';

const EMPTY_ITEM = {
  couponTypeId: '',
  quantity: 500,
  openOffsetSeconds: 0,
};

let itemKeySequence = 0;

function createFormItem(value = {}) {
  itemKeySequence += 1;
  return {
    ...EMPTY_ITEM,
    ...value,
    _key: `coupon-item-${itemKeySequence}`,
  };
}

function toFormValue(value) {
  if (!value) {
    return {
      esportsMatchId: '',
      eventName: '',
      issueMode: 'SINGLE_FIRST_COME',
      triggerType: 'FIRST_BARON_KILL',
      claimWindowSeconds: 30,
      items: [createFormItem()],
    };
  }
  return {
    esportsMatchId: value.esportsMatchId ?? '',
    eventName: value.eventName ?? '',
    issueMode: value.issueMode ?? 'SINGLE_FIRST_COME',
    triggerType: value.triggerType ?? '',
    claimWindowSeconds: value.claimWindowSeconds ?? 30,
    items: (value.items ?? []).map((item) => createFormItem({
      couponTypeId: item.couponTypeId ?? '',
      quantity: item.quantity ?? 1,
      openOffsetSeconds: item.openOffsetSeconds ?? 0,
    })),
  };
}

function formatCouponTypeOption(couponType) {
  const value = Number(couponType.discountValue);
  const benefit = couponType.discountType === 'RATE'
    ? `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`
    : `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;
  return `${couponType.couponName} · ${benefit}${couponType.status === 'INACTIVE' ? ' · 비활성' : ''}`;
}

export default function CouponEventForm({ initialValue, onSubmit, submitting, submitLabel }) {
  const [form, setForm] = useState(() => toFormValue(initialValue));
  const [validationError, setValidationError] = useState(null);
  const [couponTypes, setCouponTypes] = useState([]);
  const [couponTypesLoading, setCouponTypesLoading] = useState(true);
  const [couponTypesError, setCouponTypesError] = useState(null);

  useEffect(() => {
    setForm(toFormValue(initialValue));
  }, [initialValue]);

  useEffect(() => {
    let cancelled = false;
    setCouponTypesLoading(true);
    fetchCouponTypes()
      .then((response) => {
        if (!cancelled) {
          setCouponTypes(response);
          setCouponTypesError(null);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setCouponTypes([]);
          setCouponTypesError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) setCouponTypesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateItem = (index, field, value) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )),
  }));

  const submit = (event) => {
    event.preventDefault();
    setValidationError(null);
    const payload = {
      esportsMatchId: Number(form.esportsMatchId),
      eventName: form.eventName.trim(),
      issueMode: form.issueMode,
      triggerType: form.triggerType.trim(),
      claimWindowSeconds: Number(form.claimWindowSeconds),
      items: form.items.map((item) => ({
        couponTypeId: Number(item.couponTypeId),
        quantity: Number(item.quantity),
        openOffsetSeconds: Number(item.openOffsetSeconds),
      })),
    };

    const invalid = !payload.esportsMatchId || !payload.eventName || !payload.triggerType
      || payload.claimWindowSeconds < 1
      || payload.items.some((item) => !item.couponTypeId || item.quantity < 1 || item.openOffsetSeconds < 0);
    if (invalid) {
      setValidationError('필수 항목과 숫자 범위를 확인해 주세요.');
      return;
    }
    const selectedIds = payload.items.map((item) => item.couponTypeId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      setValidationError('한 이벤트에서 같은 쿠폰 종류를 중복 선택할 수 없습니다.');
      return;
    }
    const couponTypeById = new Map(couponTypes.map((couponType) => [Number(couponType.couponTypeId), couponType]));
    if (selectedIds.some((couponTypeId) => couponTypeById.get(couponTypeId)?.status !== 'ACTIVE')) {
      setValidationError('활성 상태인 쿠폰 종류를 선택해 주세요.');
      return;
    }
    onSubmit(payload);
  };

  return (
    <form className="admin-form" onSubmit={submit}>
      {validationError && <ErrorState>{validationError}</ErrorState>}
      <div className="form-grid two-columns">
        <label className="field-block">
          <span>경기 ID</span>
          <input
            type="number"
            min="1"
            required
            value={form.esportsMatchId}
            onChange={(event) => update('esportsMatchId', event.target.value)}
          />
          <small>이벤트가 연결될 esports match ID</small>
        </label>
        <label className="field-block">
          <span>이벤트 이름</span>
          <input
            type="text"
            maxLength="200"
            required
            value={form.eventName}
            onChange={(event) => update('eventName', event.target.value)}
          />
        </label>
        <label className="field-block">
          <span>발급 방식</span>
          <select value={form.issueMode} onChange={(event) => update('issueMode', event.target.value)}>
            <option value="SINGLE_FIRST_COME">단일 선착순</option>
            <option value="PHASED_FIRST_COME">단계별 선착순</option>
          </select>
        </label>
        <label className="field-block">
          <span>신청 가능 시간</span>
          <div className="input-with-unit">
            <input
              type="number"
              min="1"
              required
              value={form.claimWindowSeconds}
              onChange={(event) => update('claimWindowSeconds', event.target.value)}
            />
            <span>초</span>
          </div>
        </label>
      </div>

      <label className="field-block">
        <span>트리거 종류</span>
        <input
          type="text"
          required
          list="trigger-type-options"
          value={form.triggerType}
          onChange={(event) => update('triggerType', event.target.value)}
        />
        <datalist id="trigger-type-options">
          <option value="FIRST_BARON_KILL" />
        </datalist>
        <small>백엔드 이벤트 감지기의 triggerType 값과 동일해야 합니다.</small>
      </label>

      <section className="form-section">
        <div className="section-heading-row">
          <div>
            <h2>쿠폰 항목</h2>
            <p>활성 쿠폰 종류를 선택하고 수량과 단계별 오픈 시점을 입력합니다.</p>
          </div>
          <button
            className="button-secondary button-small"
            type="button"
            onClick={() => setForm((current) => ({
              ...current,
              items: [...current.items, createFormItem()],
            }))}
          >
            항목 추가
          </button>
        </div>

        {couponTypesError && (
          <ErrorState>쿠폰 종류를 불러오지 못했습니다: {couponTypesError}</ErrorState>
        )}
        {!couponTypesLoading && !couponTypesError && couponTypes.every((couponType) => couponType.status !== 'ACTIVE') && (
          <p className="surface-empty-copy">활성 쿠폰 종류가 없습니다. 먼저 ‘쿠폰 종류’ 메뉴에서 사용할 혜택을 등록하거나 활성화해 주세요.</p>
        )}

        <div className="coupon-item-list">
          {form.items.map((item, index) => (
            <div className="coupon-item-row" key={item._key}>
              <strong>항목 {index + 1}</strong>
              <label className="field-block">
                <span>쿠폰 종류</span>
                <select
                  required
                  value={item.couponTypeId}
                  onChange={(event) => updateItem(index, 'couponTypeId', event.target.value)}
                  disabled={couponTypesLoading || Boolean(couponTypesError)}
                >
                  <option value="">{couponTypesLoading ? '쿠폰 종류 불러오는 중' : '쿠폰 종류를 선택하세요'}</option>
                  {couponTypes.map((couponType) => {
                    const selectedElsewhere = form.items.some((currentItem, itemIndex) => (
                      itemIndex !== index && String(currentItem.couponTypeId) === String(couponType.couponTypeId)
                    ));
                    return (
                      <option
                        key={couponType.couponTypeId}
                        value={couponType.couponTypeId}
                        disabled={couponType.status !== 'ACTIVE' || selectedElsewhere}
                      >
                        {formatCouponTypeOption(couponType)}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="field-block">
                <span>수량</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={item.quantity}
                  onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                />
              </label>
              <label className="field-block">
                <span>오픈 지연</span>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="0"
                    required
                    value={item.openOffsetSeconds}
                    onChange={(event) => updateItem(index, 'openOffsetSeconds', event.target.value)}
                  />
                  <span>초</span>
                </div>
              </label>
              <button
                className="button-danger button-small"
                type="button"
                disabled={form.items.length === 1}
                onClick={() => setForm((current) => ({
                  ...current,
                  items: current.items.filter((_, itemIndex) => itemIndex !== index),
                }))}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="form-actions">
        <button className="button-primary" type="submit" disabled={submitting || couponTypesLoading || Boolean(couponTypesError)}>
          {submitting ? '저장 중' : submitLabel}
        </button>
      </div>
    </form>
  );
}
