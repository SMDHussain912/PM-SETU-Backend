import type { News, NewsAttachment } from "./news.types";

export type PublicNewsAttachment = Omit<NewsAttachment, "file_path">;
export type PublicNews = Omit<News, "attachments"> & {
    attachments?: PublicNewsAttachment[];
};

export function toPublicNewsAttachment(attachment: NewsAttachment): PublicNewsAttachment {
    const { file_path: _filePath, ...publicAttachment } = attachment;
    return publicAttachment;
}

export function toPublicNews(news: News): PublicNews {
    const { attachments, ...publicNews } = news;
    return {
        ...publicNews,
        ...(attachments === undefined ? {} : { attachments: attachments.map(toPublicNewsAttachment) }),
    };
}
