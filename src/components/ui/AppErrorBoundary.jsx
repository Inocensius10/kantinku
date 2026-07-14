import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('KantinKu render error:', error)
  }

  render() {
    if (this.state.error) {
      return <main className="app-error"><div className="brand-mark">K</div><h1>KantinKu belum dapat dimuat</h1><p>{this.state.error.message || 'Terjadi kesalahan saat memuat aplikasi.'}</p><button onClick={() => window.location.reload()}>Muat ulang aplikasi</button></main>
    }
    return this.props.children
  }
}
