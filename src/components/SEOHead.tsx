import { useEffect } from 'react';
import { updateMetaTags, type SEOConfig } from '../lib/seo';

interface SEOHeadProps {
  config: Partial<SEOConfig>;
}

export default function SEOHead({ config }: SEOHeadProps) {
  useEffect(() => {
    updateMetaTags(config);
  }, [config]);

  return null;
}
