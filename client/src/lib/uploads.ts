import { apiClient } from "./api-client";

export async function uploadProofFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<{ path: string }>("/uploads/proof", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.path;
}
