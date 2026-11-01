import type { SignPackV1 } from '../domain/signPack'

const DATABASE_NAME = 'orca-sign-pack-studio'
const DATABASE_VERSION = 1
const STORE_NAME = 'drafts'

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support private local draft storage.'))
      return
    }
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME))
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open local draft storage.'))
  })

const transaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, mode)
    const request = operation(tx.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Local draft operation failed.'))
    tx.oncomplete = () => database.close()
    tx.onerror = () => {
      database.close()
      reject(tx.error ?? new Error('Local draft transaction failed.'))
    }
  })
}

export const listLocalSignPacks = async () => {
  const packs = await transaction<SignPackV1[]>('readonly', (store) => store.getAll())
  return packs.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const saveLocalSignPack = async (pack: SignPackV1) => {
  await transaction<IDBValidKey>('readwrite', (store) => store.put(pack))
  return pack
}

export const deleteLocalSignPack = async (id: string) => {
  await transaction<undefined>('readwrite', (store) => store.delete(id))
}
