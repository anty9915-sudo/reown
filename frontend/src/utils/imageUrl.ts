export const imageUrl = (photo: string) =>
  !photo
    ? ""
    : /^(https?:\/\/|data:|blob:|\/)/.test(photo)
      ? photo
      : `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=700&q=85`;
