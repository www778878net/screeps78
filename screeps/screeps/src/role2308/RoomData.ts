import { extend, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
 

/**
 * 
 * 单房间数据 基础模块
 * */
export class RoomData extends Basic78 {   
    
    //本模块需要的所有前置
    props: any
    //------------------以下自动管理
    room: Room;
    sources: Source[]//资源
    spawnname:string//
    linkstorageid: string//存储旁边的link.id
    linkupid: string//控制器旁边的link.id
    storeoceid: any//矿旁边的仓库 数组
    storeupid: string//控制器旁边的仓库
    //----------------------------
    constructor(props) {
        super(); 
        //必须前置
        if (props) { 
            this.classname = props.roomname
        }
 
        super.init();
        //this.globalclass = global.mine9[this.classname]//任务挂 
        this._init()

        this.linkstorageid = this.globalclass["linkstorageid"]
        this.linkupid = this.globalclass["linkupid"]
        this.storeoceid = this.globalclass["storeoceid"]
        this.storeupid = this.globalclass["storeupid"]
        this.sources = this.globalclass["sources"]
        this.spawnname = this.globalclass["spawnname"]
        delete Memory["rolelist78"][this.classname]
    }

    getstorage( ) {

        let room = Game.rooms[this.classname]
        let storage;
        if (room && room.storage) {
            storage = room.storage
        } else {
            //那就肯定有运输到的地方 看附近的哪个库资源少
            let nexts = this.getNextRooms(this.classname)
            let energy = 9999999999
            let nextroomstorage = null
            if (nexts) {
                for (var i = 0; i < nexts.length; i++) {
                    let nextname = nexts[i]
                    room = Game.rooms[nextname]
                    if (room && room.storage) {
                        let newenergy = room.storage.store.energy
                        if (!newenergy) newenergy = 0
                        if (newenergy < energy) {
                            storage = room.storage
                            energy = newenergy
                        }
                    }
                }
            }
            if (!storage) {
                if (nexts) {
                    for (var i = 0; i < nexts.length; i++) {
                        let nextname = nexts[i]
                        let nextsnexts = this.getNextRooms(nextname)
                        for (var i = 0; i < nextsnexts.length; i++) {
                            let nextname = nextsnexts[i]
                            room = Game.rooms[nextname]
                            if (room && room.storage) {
                                let newenergy = room.storage.store.energy
                                if (!newenergy) newenergy = 0
                                if (newenergy < energy) {
                                    storage = room.storage
                                    energy = newenergy
                                }
                            }
                        }
                    }
                }
            }

        }
        return storage
    }

    /**
     * 获取某种资源的储量 罐子和交易所
     * @param resourceType
     */
    getStoreResourceType(resourceType) {
        let numtmp = 0
        if (this.room && this.room.storage && this.room.storage.store[resourceType])
            numtmp = this.room.storage.store[resourceType]
        let numtmp2 = 0
        if (this.room && this.room.terminal && this.room.terminal.store[resourceType])
            numtmp2 = this.room.terminal.store[resourceType]
        return numtmp + numtmp2
    }

    /**
     * 获取建筑
     * @param stype
     */
    getstructByType(stype) {  
        return this.globalclass[stype];
    }

    /**
     * 获取这个房间的某类爬
     * */
    getlocalcreeps(ckind) {
        if (!this.globalclass["local"]) this.globalclass["local"] = {}
        return this.globalclass["local"][ckind]
    }

    /**
     * 获取房间数据 到这里说明是要查一遍了
     *  
     */
    _init() {


        this.room = Game.rooms[this.classname]
        if (!this.room) {
            global.mine9[this.classname] = {}
            return;
        }
        //if (ref || this.iscanref(this.classname)) {
        this.globalclass["sources"] = this.room.find(FIND_SOURCES);//资源
        //this.globalclass.containers = this.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_CONTAINER } })
        this.globalclass.extractor = this.room.find(FIND_MINERALS) //特殊资源
        this.globalclass.constructionsites = this.room.find(FIND_CONSTRUCTION_SITES)//工地
        this.globalclass.structures = this.room.find(FIND_STRUCTURES) //建筑
        this.globalclass.creepsother = this.room.find(FIND_HOSTILE_CREEPS)//其它爬

        for (var i = 0; i < this.globalclass.structures.length; i++) {
            let struct = this.globalclass.structures[i]
            let stype = struct.structureType
            if (stype == "spawn")
                this.globalclass.spawnname = struct["name"]
            let id = struct.id
            if (!this.globalclass[stype]) this.globalclass[stype] = {}
            this.globalclass[stype][id] = struct
        }

      

        //计算仓库的作用
        this.globalclass["storeoceid"]   = []
        this.globalclass["storeupid"]  = "";
        for (let ckey in this.globalclass[STRUCTURE_CONTAINER]) {
            let id: any = ckey;
            let contai: any = this.getObjectById(id)// structs[ckey]
            let room = this.room;
            if (room) {
                let contral = room.controller
                if (contral.pos.inRangeTo(contai, 3)) {
                    this.globalclass["storeupid"] = id;
                    continue;
                }
                for (let sourceindex in this.globalclass["sources"]) { 
                    let source: any = this.globalclass["sources"][sourceindex]// structs[ckey]
                    
                    if (source.pos.isNearTo(contai)) {
                        this.globalclass["storeoceid"].push(id);
                        break;
                    }
                }
                //if (room.storage && room.storage.pos.inRangeTo(contai, 3)) {
                    //this.globalclass["storeoceid"].push(id);
                   // continue;
               // }
            }
        }

        //计算link的作用
        let structs = this.globalclass[STRUCTURE_LINK]
        for (let ckey in structs) {
            let id: any = ckey;
            let contai: any = this.getObjectById(id)// structs[ckey]
            let room = this.room;
            if (room) {
                let contral = room.controller
                if (contral.pos.inRangeTo(contai, 3)) {
                    this.globalclass["linkupid"]   = id;
                    continue;
                }
                if (room.storage && room.storage.pos.inRangeTo(contai, 3)) {
                    this.globalclass["linkstorageid"]   = id;
                    continue;
                }
            }
        }
        //  }
    }

  

  
     
  
   
     
  
 


}

 
 
 