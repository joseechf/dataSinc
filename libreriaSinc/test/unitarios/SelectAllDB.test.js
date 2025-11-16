// 📄 SelectAllDB.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as modulo from "../src/index.js";

// Mock del módulo sqliteadapter.js
vi.mock("../src/adapets/sqliteadapter.js", () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
}));

// Importamos los mocks (ya mockeados por vi.mock)
import { getAll, getById } from "../src/adapets/sqliteadapter.js";

// Mock global de fetch
global.fetch = vi.fn();

describe("SelectAllDB", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // limpia los mocks entre tests
  });

  it("debería llamar a getAll y fetch cuando listaidlocal y listaidremoto son null", async () => {
    // 🧠 getAll debe devolver una PROMESA que resuelva con un objeto .data,
    // porque tu función hace "reslocal.data"
    getAll.mockResolvedValue({
      data: [
        { id: 1, hash: "local1", version: 1, isdelete: 0, isupdate: 1 },
        { id: 2, hash: "local2", version: 2, isdelete: 0, isupdate: 0 },
      ],
    });

    // 🧠 getById no se usa en este caso, pero lo dejamos mockeado
    getById.mockResolvedValue({ data: [] });

    // 🧠 fetch devuelve un objeto similar a Response con .ok y .json()
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 4, hash: "remote1", version: 2, isdelete: 0, isupdate: 1 },
        { id: 3, hash: "remote3", version: 1, isdelete: 0, isupdate: 1 },
      ],
    });

    // Ejecutar la función a probar
    const [hasheslocal, hashesremoto] = await modulo.SelectAllDB(
      "tablaSinc",
      null,
      null
    );

    // ✅ Aserciones
    expect(getAll).toHaveBeenCalledWith("tablaSinc");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(hasheslocal).toHaveLength(2);
    expect(hashesremoto).toHaveLength(2);
  });
});