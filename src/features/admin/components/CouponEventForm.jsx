import { useEffect, useMemo, useState } from 'react';
import {
  fetchCouponEventTriggers,
  fetchCouponType,
  fetchCouponTypeOptions,
} from '../../../api/admin.js';
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

/**
 * 테스트 전용으로 예약한 경기 ID. 백엔드 CouponTestMatch.SAMPLE_MATCH_ID 와 같아야 한다.
 *
 * replay 재생은 실행할 때마다 경기 ID 를 새로 만들어 실제 경기에 이벤트를 미리
 * 걸어둘 수 없다. 그래서 고정된 이 ID 로 만들어 두고 재생 중 트리거가 이 ID 로 열린다.
 */
const SAMPLE_MATCH_ID = -1;

function toFormValue(value) {
  if (!value) {
    return {
      isTest: false,
      esportsMatchId: '',
      eventName: '',
      issueMode: 'SINGLE_FIRST_COME',
      triggerType: 'FIRST_BARON_KILL',
      claimWindowSeconds: 30,
      items: [createFormItem()],
    };
  }
  return {
    isTest: value.esportsMatchId === SAMPLE_MATCH_ID,
    esportsMatchId: value.esportsMatchId === SAMPLE_MATCH_ID
      ? ''
      : value.esportsMatchId ?? '',
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
  return `${couponType.couponName} · ${benefit}`;
}

export default function CouponEventForm({ initialValue, onSubmit, submitting, submitLabel }) {
  const [form, setForm] = useState(() => toFormValue(initialValue));
  const [validationError, setValidationError] = useState(null);
  const [triggers, setTriggers] = useState([]);
  const [couponTypes, setCouponTypes] = useState([]);
  const [selectedCouponTypes, setSelectedCouponTypes] = useState({});
  const [couponTypeKeyword, setCouponTypeKeyword] = useState('');
  const [couponTypeNextCursor, setCouponTypeNextCursor] = useState(null);
  const [couponTypeHasNext, setCouponTypeHasNext] = useState(false);
  const [couponTypesLoading, setCouponTypesLoading] = useState(true);
  const [couponTypesError, setCouponTypesError] = useState(null);

  useEffect(() => {
    setForm(toFormValue(initialValue));
  }, [initialValue]);

  // 트리거 목록은 서버가 가진 것이 기준이다 — 늘어나도 프론트를 고치지 않는다
  useEffect(() => {
    let cancelled = false;
    fetchCouponEventTriggers()
      .then((list) => { if (!cancelled) setTriggers(list ?? []); })
      .catch(() => { if (!cancelled) setTriggers([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const selectedIds = (initialValue?.items ?? [])
      .map((item) => item.couponTypeId)
      .filter(Boolean);
    if (selectedIds.length === 0) return undefined;
    let cancelled = false;
    Promise.all(selectedIds.map((couponTypeId) => fetchCouponType(couponTypeId)))
      .then((responses) => {
        if (!cancelled) {
          setSelectedCouponTypes(Object.fromEntries(
            responses.map((couponType) => [couponType.couponTypeId, couponType]),
          ));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initialValue]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setCouponTypesLoading(true);
      fetchCouponTypeOptions({ keyword: couponTypeKeyword })
        .then((response) => {
          if (!cancelled) {
            setCouponTypes(response.options);
            setCouponTypeNextCursor(response.nextCursor);
            setCouponTypeHasNext(response.hasNext);
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
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [couponTypeKeyword]);

  const loadMoreCouponTypes = async () => {
    setCouponTypesLoading(true);
    setCouponTypesError(null);
    try {
      const response = await fetchCouponTypeOptions({
        keyword: couponTypeKeyword,
        cursor: couponTypeNextCursor,
      });
      setCouponTypes((current) => [...current, ...response.options]);
      setCouponTypeNextCursor(response.nextCursor);
      setCouponTypeHasNext(response.hasNext);
    } catch (requestError) {
      setCouponTypesError(requestError.message);
    } finally {
      setCouponTypesLoading(false);
    }
  };

  const selectableCouponTypes = useMemo(() => {
    const byId = new Map(couponTypes.map((couponType) => [
      String(couponType.couponTypeId),
      couponType,
    ]));
    Object.values(selectedCouponTypes).forEach((couponType) => {
      byId.set(String(couponType.couponTypeId), couponType);
    });
    return [...byId.values()];
  }, [couponTypes, selectedCouponTypes]);

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
      // 테스트 이벤트는 실제 경기가 없으므로 예약 ID 로 보낸다
      esportsMatchId: form.isTest ? SAMPLE_MATCH_ID : Number(form.esportsMatchId),
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
            required={!form.isTest}
            disabled={form.isTest}
            value={form.isTest ? '' : form.esportsMatchId}
            onChange={(event) => update('esportsMatchId', event.target.value)}
            placeholder={form.isTest ? '테스트 이벤트는 경기 번호가 필요 없습니다' : ''}
          />
          <small>
            {form.isTest
              ? '테스트 재생 중 트리거가 감지되면 이 이벤트가 열립니다'
              : '이벤트를 적용할 경기의 번호'}
          </small>
        </label>
        <label className="field-block checkbox-field">
          <span>테스트 이벤트</span>
          <input
            type="checkbox"
            checked={form.isTest}
            onChange={(event) => update('isTest', event.target.checked)}
          />
          <small>
            실제 경기 없이 테스트 재생으로 시연합니다. 재생할 때마다 경기 번호가
            새로 만들어져 실제 경기로는 미리 등록할 수 없습니다.
          </small>
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
        <select
          required
          value={form.triggerType}
          onChange={(event) => update('triggerType', event.target.value)}
        >
          {/* 저장된 값이 목록에 없을 수 있다(과거 자유 입력) — 지워지지 않게 남겨둔다 */}
          {form.triggerType
            && !triggers.some((t) => t.value === form.triggerType) && (
              <option value={form.triggerType}>{form.triggerType}</option>
            )}
          {triggers.map((trigger) => (
            <option key={trigger.value} value={trigger.value}>
              {trigger.label} ({trigger.value})
            </option>
          ))}
        </select>
        <small>
          경기 중 이 사건이 감지되면 이벤트가 열립니다.
          수동 테스트는 MANUAL_TEST 를 선택해 주세요.
        </small>
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
        <label className="field-block">
          <span>쿠폰 종류 이름 검색</span>
          <input
            type="search"
            value={couponTypeKeyword}
            onChange={(event) => setCouponTypeKeyword(event.target.value)}
            placeholder="예: 10% 할인"
          />
        </label>
        {!couponTypesLoading && !couponTypesError && couponTypes.length === 0 && (
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
                  onChange={(event) => {
                    const couponTypeId = event.target.value;
                    updateItem(index, 'couponTypeId', couponTypeId);
                    const selected = selectableCouponTypes.find((couponType) => (
                      String(couponType.couponTypeId) === couponTypeId
                    ));
                    if (selected) {
                      setSelectedCouponTypes((current) => ({
                        ...current,
                        [selected.couponTypeId]: selected,
                      }));
                    }
                  }}
                  disabled={couponTypesLoading || Boolean(couponTypesError)}
                >
                  <option value="">{couponTypesLoading ? '쿠폰 종류 불러오는 중' : '쿠폰 종류를 선택하세요'}</option>
                  {selectableCouponTypes.map((couponType) => {
                    const selectedElsewhere = form.items.some((currentItem, itemIndex) => (
                      itemIndex !== index && String(currentItem.couponTypeId) === String(couponType.couponTypeId)
                    ));
                    return (
                      <option
                        key={couponType.couponTypeId}
                        value={couponType.couponTypeId}
                        disabled={selectedElsewhere}
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
        {couponTypeHasNext && (
          <div className="form-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={loadMoreCouponTypes}
              disabled={couponTypesLoading}
            >
              {couponTypesLoading ? '불러오는 중' : '쿠폰 종류 더 불러오기'}
            </button>
          </div>
        )}
      </section>

      <div className="form-actions">
        <button className="button-primary" type="submit" disabled={submitting || couponTypesLoading || Boolean(couponTypesError)}>
          {submitting ? '저장 중' : submitLabel}
        </button>
      </div>
    </form>
  );
}
