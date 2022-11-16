import { google } from 'googleapis';
import service from '../../google-services.js';

const auth = new google.auth.JWT(
  service.client_email,
  null,
  service.private_key,
  'https://www.googleapis.com/auth/analytics.readonly'
);

google.options({ auth });

const analytics = google.analyticsdata('v1beta');

export const runReports = async (data) => {
  if (!Array.isArray(data)) data = [data];

  return analytics.properties
    .batchRunReports({
      property: `properties/${process.env.ANALYTICS_ID}`,
      requestBody: {
        requests: data.map((request) => ({
          keepEmptyRows: true,
          ...request,
        })),
      },
    })
    .then((res) => res.data.reports);
};

export default analytics;
