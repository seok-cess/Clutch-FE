import { useCallback, useEffect, useState } from 'react';
import {
  changeCouponTypeStatus,
  createCouponType,
  deleteCouponType,
  fetchCouponTypes,
  updateCouponType,
} from '../../../api/admin.js';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/AsyncState.jsx';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import StatusBadge from '../../../shared/components/StatusBadge.jsx';
import { formatDateTime } from '../../../shared/utils/format.js';

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
];

const EMPTY_FORM = {
  couponName: '',
  discountType: 'RATE',
  discountValue: '',
};

function formatBenefit(couponType) {
  const value = Number(couponType.discountValue);
  if (!Number.isFinite(value)) return '-';
  if (couponType.discountType === 'RATE') return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;
}

function validateForm(form) {
  const name = form.couponName.trim();
  const value = Number(form.discountValue);
  if (!name) return '쿠폰 이름을 입력해주세요.';
  if (name.length > 100) return '쿠폰 이름은 100자 이하여야 합니다.';
  if (!Number.isFinite(value) || value <= 0) return '할인 값은 0보다 커야 합니다.';
  if (form.discountType === 'RATE' && value > 100) return '정률 할인은 100% 이하여야 합니다.';
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(form.discountValue))) {
    return '할인 값은 정수 8자리, 소수 2자리 이하로 입력해주세요.';
  }
  return null;
}

export default function CouponTypesManager() {
  const [status, setStatus] = useState('');
  const [couponTypes, setCouponTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);

  const loadCouponTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCouponTypes(await fetchCouponTypes(status || undefined));
    } catch (requestError) {
      setCouponTypes([]);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadCouponTypes();
  }, [loadCouponTypes]);

  const closeForm = () => {
    setFormMode(null);
    setEditing(null);
  };

  const openCreate = () => {
    setNotice(null);
    setEditing(null);
    setFormMode('create');
  };

  const openEdit = (couponType) => {
    setNotice(null);
    setEditing(couponType);
    setFormMode('edit');
  };

  const submitForm = async (payload) => {
    if (formMode === 'edit') {
      await updateCouponType(editing.couponTypeId, payload);
      setNotice('쿠폰 종류의 혜택 정보를 수정했습니다.');
    } else {
      await createCouponType(payload);
      setNotice('새 쿠폰 종류를 활성 상태로 등록했습니다.');
    }
    closeForm();
    await loadCouponTypes();
  };

  const toggleStatus = async (couponType) => {
    const nextStatus = couponType.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setMutatingId(couponType.couponTypeId);
    setError(null);
    setNotice(null);
    try {
      await changeCouponTypeStatus(couponType.couponTypeId, nextStatus);
      setNotice(`${couponType.couponName}을(를) ${nextStatus === 'ACTIVE' ? '활성화' : '비활성화'}했습니다.`);
      await loadCouponTypes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMutatingId(null);
    }
  };

  const removeCouponType = async (couponType) => {
    if (!window.confirm(`“${couponType.couponName}” 쿠폰 종류를 삭제할까요?`)) return;
    setMutatingId(couponType.couponTypeId);
    setError(null);
    setNotice(null);
    try {
      await deleteCouponType(couponType.couponTypeId);
      setNotice('쿠폰 종류를 삭제했습니다.');
      await loadCouponTypes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="쿠폰 종류"
        description="쿠폰 이벤트에 사용할 할인 혜택을 등록하고 활성 상태를 관리합니다."
        actions={<button className="button-primary" type="button" onClick={openCreate}>쿠폰 종류 등록</button>}
      />

      {notice && <div className="operation-notice" role="status">{notice}</div>}
      {formMode && (
        <CouponTypeForm
          key={editing?.couponTypeId ?? 'new'}
          couponType={editing}
          onCancel={closeForm}
          onSubmit={submitForm}
        />
      )}

      <section className="toolbar data-surface">
        <label className="compact-field">
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
        </label>
        <button className="button-secondary" type="button" onClick={loadCouponTypes} disabled={loading}>새로고침</button>
      </section>

      {loading ? <LoadingState /> : error ? (
        <ErrorState>{error}</ErrorState>
      ) : couponTypes.length === 0 ? (
        <EmptyState title="등록된 쿠폰 종류가 없습니다." description="쿠폰 종류를 등록하면 이벤트 생성 시 할인 혜택으로 사용할 수 있습니다." />
      ) : (
        <section className="data-surface admin-table-surface coupon-type-table-surface">
          <div className="responsive-table-wrap">
            <table className="app-table coupon-type-table">
              <thead>
                <tr><th>ID</th><th>쿠폰 이름</th><th>할인 혜택</th><th>상태</th><th>이벤트 사용</th><th>최종 수정</th><th className="table-action">관리</th></tr>
              </thead>
              <tbody>
                {couponTypes.map((couponType) => {
                  const mutating = mutatingId === couponType.couponTypeId;
                  return (
                    <tr key={couponType.couponTypeId}>
                      <td>{couponType.couponTypeId}</td>
                      <td><strong className="coupon-type-name">{couponType.couponName}</strong></td>
                      <td><span className="coupon-benefit">{formatBenefit(couponType)}</span><small>{couponType.discountType === 'RATE' ? '정률 할인' : '정액 할인'}</small></td>
                      <td><StatusBadge status={couponType.status} /></td>
                      <td>{couponType.used ? <span className="usage-label used">사용됨</span> : <span className="usage-label">미사용</span>}</td>
                      <td>{formatDateTime(couponType.updatedAt)}</td>
                      <td className="table-action">
                        <div className="table-action-group">
                          <button className="button-secondary button-small" type="button" onClick={() => openEdit(couponType)} disabled={couponType.used || mutating} title={couponType.used ? '이벤트 사용 이력이 있어 혜택을 수정할 수 없습니다.' : undefined}>수정</button>
                          <button className="button-secondary button-small" type="button" onClick={() => toggleStatus(couponType)} disabled={mutating}>{couponType.status === 'ACTIVE' ? '비활성화' : '활성화'}</button>
                          <button className="button-danger button-small" type="button" onClick={() => removeCouponType(couponType)} disabled={couponType.used || mutating} title={couponType.used ? '이벤트 사용 이력이 있어 삭제할 수 없습니다.' : undefined}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function CouponTypeForm({ couponType, onCancel, onSubmit }) {
  const editing = Boolean(couponType);
  const [form, setForm] = useState(() => couponType ? {
    couponName: couponType.couponName,
    discountType: couponType.discountType,
    discountValue: String(couponType.discountValue),
  } : EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const changeField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        couponName: form.couponName.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="data-surface form-surface coupon-type-form-surface">
      <div className="section-heading-row">
        <div><h2>{editing ? '쿠폰 종류 수정' : '쿠폰 종류 등록'}</h2><p>{editing ? '아직 이벤트에서 사용되지 않은 할인 혜택만 수정할 수 있습니다.' : '등록된 쿠폰 종류는 활성 상태로 생성됩니다.'}</p></div>
      </div>
      {error && <ErrorState>{error}</ErrorState>}
      <form className="admin-form coupon-type-form" onSubmit={submit}>
        <label className="field-block coupon-type-name-field">
          <span>쿠폰 이름</span>
          <input required maxLength="100" value={form.couponName} onChange={(event) => changeField('couponName', event.target.value)} placeholder="예: LCK 승리 기념 10% 할인" />
        </label>
        <label className="field-block">
          <span>할인 유형</span>
          <select value={form.discountType} onChange={(event) => changeField('discountType', event.target.value)}>
            <option value="RATE">정률 할인</option>
            <option value="AMOUNT">정액 할인</option>
          </select>
        </label>
        <label className="field-block">
          <span>할인 값</span>
          <div className="input-with-unit">
            <input required type="number" min="0.01" max={form.discountType === 'RATE' ? '100' : '99999999.99'} step="0.01" value={form.discountValue} onChange={(event) => changeField('discountValue', event.target.value)} />
            <span>{form.discountType === 'RATE' ? '%' : '원'}</span>
          </div>
        </label>
        <div className="coupon-type-form-actions">
          <button className="button-secondary" type="button" onClick={onCancel}>취소</button>
          <button className="button-primary" type="submit" disabled={submitting}>{submitting ? '저장 중' : editing ? '변경사항 저장' : '등록'}</button>
        </div>
      </form>
    </section>
  );
}
