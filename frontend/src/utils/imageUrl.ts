export const imageUrl = (photo: string) =>
  !photo
    ? ""
    : photo.startsWith("data:")
      ? photo
      : `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=700&q=85`;
