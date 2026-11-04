# Repository discoverability and search indexing

## What this project controls

GitHub repository search and external web search are separate systems. Repository names, descriptions, topics and README content are searchable fields on GitHub. Topics help users browse related projects. Keep them specific to the supported model and implemented functions. See [GitHub repository search](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories) and [GitHub topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics).

The README starts with the exact model name and explains the common `WIN60 HE MAX` spelling. It links to the working application, documentation and issue form. Hardware limitations are stated rather than claiming support for other models. Broad, unrelated topics and unsupported firmware-download claims are excluded.

## Public website

The application has a descriptive title, concise description, canonical URL, social preview metadata and truthful WebApplication structured data. The static English `/guide/` page provides useful setup, compatibility and troubleshooting content without JavaScript or USB access. It links to the app and repository with normal HTML anchors.

Google recommends descriptive titles and crawlable links, and explains how JavaScript rendering affects indexing. Static guide content makes the information available before application execution; it is not a promise of ranking. See [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) and [Search Essentials](https://developers.google.com/search/docs/essentials).

The project sitemap includes only the actual app root and guide URLs. Hash-based application sections are not presented as independent pages. Update `lastmod` only when the corresponding content changes. The project-level `robots.txt` points to the sitemap, but GitHub Pages project hosting cannot make that file the host-wide `https://primebuild-pc.github.io/robots.txt`. Do not claim control of the entire host's crawl policy.

Interface language choices share one application URL. They are not separate indexed language pages, so no artificial `hreflang` URL variants are advertised. If real static translations are published later, give them stable URLs, accurate language tags and reciprocal alternate links. See [Google's multilingual-site guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

Structured data describes the app and visible guide. It contains no invented ratings, review counts, download totals or endorsements. Eligibility for a search enhancement is not guaranteed by valid markup.

## Owner-only follow-up

Once the deployment is confirmed, the owner may verify a URL-prefix property for `https://primebuild-pc.github.io/aula-win60he-tool/` in Google Search Console or Bing Webmaster Tools and submit the sitemap. This requires the owner's verified account; no verification token is invented or bundled. Inspect the actual published root and guide before requesting indexing.

The work does not buy backlinks, publish unsolicited promotions, fabricate reviews or submit to unrelated directories. Relevant community references and genuine user reports may help discovery over time, but they require authentic interest and the destination's rules.

## Validation

Check local links, canonical/OG URLs, sitemap entries, structured-data JSON and guide content without JavaScript. Check the GitHub About description, homepage and topic list after updating them. Confirm the actual served version after deployment. Search position, index inclusion, impressions and clicks require real search-engine data over time; none is inferred from a successful build.
