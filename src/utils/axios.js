import client from 'axios';

const axios = client.create();

axios.interceptors.response.use(
  (response) => response.data,
  (err) => {
    console.log(err.response.data);
    if (err.response) {
      return Promise.reject({
        status: err.response.status,
        ...(typeof err.response.data === 'object' ? err.response.data : {}),
      });
    } else if (err.request) {
      throw new Error(err.message);
    } else {
      throw new Error(err);
    }
  }
);

export default axios;
