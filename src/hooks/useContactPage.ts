import { useQuery } from "@tanstack/react-query";
import { ContactService } from "../services/ContactService";

const contactService = new ContactService();

export const useContactPage = () =>
  useQuery({
    queryKey: ["contact-page-config"],
    queryFn: () => contactService.getContactPageConfig(),
  });
