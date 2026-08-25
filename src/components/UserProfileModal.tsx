"use client";

import {
  UserProfileCard,
  type UserProfileCardProps,
} from "./profile/UserProfileCard";

export type UserProfileModalProps = UserProfileCardProps;

export default function UserProfileModal(props: UserProfileModalProps) {
  return <UserProfileCard {...props} variant="popout" />;
}
