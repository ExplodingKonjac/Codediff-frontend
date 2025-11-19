export class SSEClient {
  constructor(url, onMessage, onError, onCompleted) {
    this.url = url
    this.onMessage = onMessage
    this.onError = onError
    this.onCompleted = onCompleted
    this.eventSource = null
    this.isConnected = false
  }
  
  connect() {
    if (this.isConnected) return
    
    this.eventSource = new EventSource(this.url, { withCredentials: true })
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'completed') {
          this.onCompleted?.(data)
          this.close()
        } else {
          this.onMessage?.(data)
        }
      } catch (e) {
        console.error('Error parsing SSE message:', e)
        this.onError?.({ message: 'Invalid SSE data format' })
      }
    }
    
    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      this.onError?.({ message: 'Connection error', error })
      this.close()
    }
    
    this.isConnected = true
    console.log('SSE connection established')
  }
  
  close() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false
      console.log('SSE connection closed')
    }
  }
}