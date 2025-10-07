import { GraphQLClient } from 'graphql-request';

const endpoint = process.env.WORDPRESS_GRAPHQL_URL;

export const client = new GraphQLClient(endpoint, {
  headers: {},
});

// Query voor alle posts (met GEO optimization fields!)
export const GET_ALL_POSTS = `
  query GetAllPosts($first: Int = 100) {
    posts(first: $first, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        slug
        excerpt
        date
        modified
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              width
              height
            }
          }
        }
        seo {
          title
          metaDesc
          opengraphTitle
          opengraphDescription
          opengraphImage {
            sourceUrl
          }
          schema {
            raw
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        author {
          node {
            name
            description
            avatar {
              url
            }
          }
        }
      }
    }
  }
`;

// Query voor één post (COMPLETE SEO + AI data!)
export const GET_POST_BY_SLUG = `
  query GetPostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      id
      title
      slug
      content
      excerpt
      date
      modified
      featuredImage {
        node {
          sourceUrl
          altText
          mediaDetails {
            width
            height
          }
        }
      }
      seo {
        title
        metaDesc
        focuskw
        opengraphTitle
        opengraphDescription
        opengraphType
        opengraphImage {
          sourceUrl
        }
        twitterTitle
        twitterDescription
        twitterImage {
          sourceUrl
        }
        schema {
          raw
        }
        breadcrumbs {
          text
          url
        }
      }
      categories {
        nodes {
          name
          slug
        }
      }
      tags {
        nodes {
          name
          slug
        }
      }
      author {
        node {
          name
          description
          avatar {
            url
          }
          seo {
            social {
              twitter
              linkedIn
            }
          }
        }
      }
    }
  }
`;

// Query voor homepage (laatste posts)
export const GET_LATEST_POSTS = `
  query GetLatestPosts($first: Int = 3) {
    posts(first: $first, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        slug
        excerpt
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        seo {
          metaDesc
        }
      }
    }
  }
`;