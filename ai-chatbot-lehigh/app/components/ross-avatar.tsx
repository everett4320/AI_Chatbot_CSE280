const rossAvatarUrl = `${import.meta.env.BASE_URL}figma/ross-avatar.png`;

export function RossAvatar() {
  return <img className="ross-message__avatar" src={rossAvatarUrl} alt="" />;
}
