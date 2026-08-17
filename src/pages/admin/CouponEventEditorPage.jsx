import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  createCouponEvent,
  fetchCouponEvent,
  updateCouponEvent,
} from '../../api/admin.js';
import CouponEventForm from '../../features/admin/components/CouponEventForm.jsx';
import { ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function CouponEventEditorPage() {
  const navigate = useNavigate();
  const { couponEventId } = useParams();
  const editing = Boolean(couponEventId);
  const [initialValue, setInitialValue] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editing) return undefined;
    let cancelled = false;
    fetchCouponEvent(couponEventId)
      .then((event) => { if (!cancelled) setInitialValue(event); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [couponEventId, editing]);

  const submit = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = editing
        ? await updateCouponEvent(couponEventId, payload)
        : await createCouponEvent(payload);
      navigate(`/admin/coupon-events/${result.couponEventId}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-page editor-page">
      <PageHeader
        title={editing ? '쿠폰 이벤트 수정' : '쿠폰 이벤트 생성'}
        description="경기 트리거, 신청 시간과 발급할 쿠폰 항목을 설정합니다."
      />
      {error && <ErrorState>{error}</ErrorState>}
      {loading ? <LoadingState /> : (
        <section className="data-surface form-surface">
          <CouponEventForm
            initialValue={initialValue}
            onSubmit={submit}
            submitting={submitting}
            submitLabel={editing ? '변경 사항 저장' : '이벤트 생성'}
          />
        </section>
      )}
    </div>
  );
}
