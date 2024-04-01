let _global_memory = undefined
export const sayHello = function () {
    if (_global_memory) {
        delete global.Memory;
        global.Memory = _global_memory;
        RawMemory._parsed = global.Memory;
    } else {
        _global_memory = global.Memory
    }
    console.log(global.tick+'  hello world230420=================================================================================================================')
    //console.log(global.Memory)
    //throw new Error('我是 sayHello 里的报错')
}