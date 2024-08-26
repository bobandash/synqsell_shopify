import gql from 'graphql-tag';

export const MODEL_3D_FIELDS_FRAGMENT = gql`
  fragment Model3dFields on Model3d {
    mediaContentType
    alt
    originalSource {
      url
    }
  }
`;

export const VIDEO_FIELDS_FRAGMENT = gql`
  fragment VideoFields on Video {
    mediaContentType
    alt
    originalSource {
      url
    }
  }
`;

export const IMAGE_FIELDS_FRAGMENT = gql`
  fragment ImageFields on Image {
    url
    alt: altText,
  }
`
