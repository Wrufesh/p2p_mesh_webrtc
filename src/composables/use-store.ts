import { provide, inject } from "vue"
const StoreSymbol = Symbol()

export function provideStore(store){
    provide(StoreSymbol, store)
}

export function useStore(){
    const store = inject(StoreSymbol)

    if (!store){
        //future
    }
    return store
}