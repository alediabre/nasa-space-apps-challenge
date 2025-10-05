import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console and keep info for UI
    console.error('ErrorBoundary caught an error', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.toString() || 'Unknown error';
      const stack = this.state.error?.stack || (this.state.info && this.state.info.componentStack) || '';
      return (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 20, zIndex: 99999, overflow: 'auto'}}>
          <h2 style={{color: '#ff6b6b'}}>Application Error</h2>
          <pre style={{whiteSpace: 'pre-wrap'}}>{message}</pre>
          <details style={{marginTop: 12, color: '#ddd'}}>
            <summary>Stack / Component Info</summary>
            <pre style={{whiteSpace: 'pre-wrap'}}>{stack}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
