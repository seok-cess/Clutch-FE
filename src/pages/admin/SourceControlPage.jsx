import ExternalSourceControl from '../../features/live/ExternalSourceControl.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function SourceControlPage() {
  return (
    <div className="admin-page">
      <PageHeader
        title="소스 제어"
        description="모든 사용자에게 적용되는 라이브 데이터 소스를 전환합니다."
      />
      <ExternalSourceControl />
    </div>
  );
}
