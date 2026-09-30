# ANM-WEB-107 Media Transformations

`MediaTransformationService` records planned variants for each destination:

- Image sizes
- Thumbnails
- Square, portrait, landscape, and banner artwork
- Social graphics
- Quote graphics
- Video thumbnails
- Preview clips
- Waveform videos
- Animated covers
- Short clips
- Preview audio
- Trailer videos
- GIFs
- Platform exports

The service records transformation plans and completion state. Actual derivative generation remains delegated to the production media processing worker so distribution does not mark derivative files ready without verified media-worker output.
