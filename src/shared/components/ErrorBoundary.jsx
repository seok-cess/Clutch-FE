import { Component } from 'react';

/**
 * 렌더 중 예외를 여기서 멈춘다.
 *
 * 경계가 없으면 React 가 트리 전체를 언마운트해서, 예외가 난 화면 하나가 아니라
 * 앱 전체가 빈 화면이 된다. 원인과 무관한 화면(샘플·일정)까지 같이 사라져
 * 무엇이 깨졌는지 화면만 보고는 알 수 없다.
 *
 * 라우트 단위로 감싸므로 헤더와 메뉴는 남고 본문만 오류로 바뀐다.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // 개발 중에는 스택이 있어야 원인을 찾을 수 있다
    console.error('화면 렌더 중 오류', error, info);
  }

  /** 라우트가 바뀌면 오류 상태를 비워 다시 그려본다 */
  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="user-content">
        <section className="panel">
          <h2>화면을 표시하지 못했습니다</h2>
          <p className="muted">
            이 화면을 그리는 중 오류가 발생했습니다. 다른 메뉴는 정상적으로 사용할 수 있습니다.
          </p>
          <pre className="error-detail">{String(error?.message ?? error)}</pre>
          <button type="button" onClick={() => this.setState({ error: null })}>
            다시 시도
          </button>
        </section>
      </main>
    );
  }
}
