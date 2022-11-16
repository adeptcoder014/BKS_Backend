import groupBy from 'lodash/groupBy.js';
import map from 'lodash/map.js';
import head from 'lodash/head.js';
import pick from 'lodash/pick.js';
import Faq from '../../models/faq.js';
import { Apps } from '../../utils/constants.js';

export const getFaqs = async (req, res) => {
  const faqs = await Faq.find({ app: Apps.MERCHANT }).lean();
  const grouped = groupBy(faqs, 'category');
  const result = map(grouped, (group) => ({
    category: head(group, 'category').category,
    data: group.map((item) => pick(item, ['question', 'answer'])),
  }));

  res.json(result);
};
