import { useMutation, useQuery } from "@tanstack/react-query";
import { publicFormsApiService } from "../../services/public/PublicFormsApiService";
import type { ContactSubmissionPayload, NewsletterSubscribePayload } from "../../services/public/publicFormTypes";

export const useContactAvailability = () =>
  useQuery({ queryKey: ["public-forms", "contact", "availability"], queryFn: () => publicFormsApiService.getContactAvailability(), staleTime: 30_000 });

export const useSubmitContact = () =>
  useMutation({ mutationFn: (payload: ContactSubmissionPayload) => publicFormsApiService.submitContact(payload), retry: false });

export const useNewsletterAvailability = () =>
  useQuery({ queryKey: ["public-forms", "newsletter", "availability"], queryFn: () => publicFormsApiService.getNewsletterAvailability(), staleTime: 30_000 });

export const useSubscribeNewsletter = () =>
  useMutation({ mutationFn: (payload: NewsletterSubscribePayload) => publicFormsApiService.subscribeNewsletter(payload), retry: false });

export const useConfirmNewsletter = () =>
  useMutation({ mutationFn: (token: string) => publicFormsApiService.confirmNewsletter(token), retry: false });

export const useUnsubscribeNewsletter = () =>
  useMutation({ mutationFn: (token: string) => publicFormsApiService.unsubscribeNewsletter(token), retry: false });
