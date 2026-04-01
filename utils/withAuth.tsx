// utils/withAuth.tsx
import React from "react";

/**
 * 전체 공개 모드:
 * - 인증 검사/리다이렉트/로딩 표시 모두 제거
 * - withAuth로 감싼 페이지도 그대로 렌더링
 */
export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  const ComponentWithAuth = (props: P): React.ReactElement | null => {
    return <WrappedComponent {...props} />;
  };
  return ComponentWithAuth;
}

export default withAuth;