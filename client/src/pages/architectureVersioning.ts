export interface ArchitectureVersionSnapshot {
  id: number;
  version: number;
  title: string;
  content: string | null;
}

export interface ArchitectureVersionDraftBase {
  id: number;
  version: number;
  description: string;
}

export function createVersionDraftFromSnapshot(
  snapshot: ArchitectureVersionSnapshot
) {
  return {
    base: {
      id: snapshot.id,
      version: snapshot.version,
      description: `基于 v${snapshot.version} 创建`,
    },
    title: snapshot.title,
    content: snapshot.content ?? "",
  };
}
