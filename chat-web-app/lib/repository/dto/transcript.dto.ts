export interface TranscriptDto {
    id: string;
    title: string;
    content: string;
    patientId: string;
    providerId: string;
    recordingDate: Date;
    createdAt: Date;
    updatedAt: Date;
}
