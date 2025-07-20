const getApiBaseUrl = () => {
    return import.meta.env.PROD
        ? import.meta.env.VITE_API_BASE_URL_PRODUCTION || 'https://watchfi-prod.onrender.com/'
        : import.meta.env.VITE_API_BASE_URL_DEVELOPMENT || 'http://localhost:3000/';
};

const api = {
    baseURL: typeof window !== 'undefined' ? window.location.origin : getApiBaseUrl(),
    endpoints: {
        collections: '/api/v1/collections',
        collectionDetails: '/api/v1/collections/',
        filter: '/api/v1/filter',
        customers: '/api/v1/customers',
        bookings: '/api/vi/bookings',
        verifyBookings: '/api/v1/bookings/verify'
    },
    getUrl: function (endpoint, param = '') {
        // console.log(`${this.baseURL}${this.endpoints[endpoint]}${param}`);
        return `${this.baseURL}${this.endpoints[endpoint]}${param}`;
    }
};

export default api;

// const getApiBaseUrl = () => {
//     return import.meta.env.PROD
//         ? import.meta.env.VITE_API_BASE_URL_PRODUCTION || 'https://your-app.onrender.com'
//         : import.meta.env.VITE_API_BASE_URL_DEVELOPMENT || 'http://localhost:5000';
// };

// const api = {
//     // baseURL: typeof window !== 'undefined' ? window.location.origin : getApiBaseUrl(),
//     baseURL: getApiBaseUrl(),
//     endpoints: {
//         collections: '/api/v1/collections',
//         collectionDetails: '/api/v1/collections/',
//         filter: '/api/v1/filter'
//     },
//     getUrl: function (endpoint) {
//         alert('we here');
//         console.log(window.location.origin)
//         return `${this.baseURL}${this.endpoints[endpoint]}`;
//     }
// };

// export default api;