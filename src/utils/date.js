export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'

  const defaultOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false, // Use 24-hour format by default if preferred, or remove to respect locale default
  }

  return new Intl.DateTimeFormat(undefined, { ...defaultOptions, ...options }).format(date)
}
