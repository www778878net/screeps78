import { extend, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";


/**
 * ����ģ��  
 * ǰ��Ӹ�����ģ�� �ܵ����ȵ� �����˲������
 * ���ܣ�
 * 
 * */
export class Spawn78 extends Basic78 {
    //��ģ����Ҫ������ǰ��
    props: any
    roomdatas: RoomData78//��������
    seting:any
    //------------------�����Զ�����
    createlist: object//�������
    shipstore: number//һ���� 2�˵����� 
    //----------------------------
    constructor(props) {
        super();

        this.classname = "Spawn78"
        this.logleaveAuto = 26;//26  
        super.init();
        //this.globalclass = global.mine9[this.classname]//����� 

        //����Ҫ��ǰ��
        if (props) { 
            this.roomdatas = props.roomdatas 
            this.seting = props.seting
        }
        if (!this.globalclass["createlist"]) this.globalclass["createlist"] = {}
        this.createlist = this.globalclass["createlist"]
        this.shipstore=200
     
    }

    /**
     *  ����
     * */
    run() {
        this.createlist = this.getGlobalclass()["createlist"]
        this.addlog("run", "--run init ::", 26, this.createlist  )
 
        //this.AddLog("run init2 :", 26, global.mine9[this.classname]);
        this._doCreatelist();
    }

    _doCreatelist() {
        //һ��������spawn ��غ���Щû����������
        let nospawn = {}
        for (let spawnname in Game.spawns) {
            let spawn = Game.spawns[spawnname]
            this.addlog("_doCreatelist", "--_doCreatelist:" + spawnname, 25, this.createlist
                , spawnname           );
            if (spawn.spawning) continue;
            if (spawnname=="www778878net"&& !Game.creeps["debug"]) {
                spawn.spawnCreep([TOUGH], "debug", {
                    "memory":
                    {
                        //"rolekey": "", "sourceid": "", "targetid": ""
                        //, "creepname": "",
                        "debuglogkey": "~~"
                    }
                });
                continue;
            }
            
          
            let roomname = spawn.room.name
            if (!this.seting.rooms[roomname]) continue;
          

            let createlisttopkey =""
            let createlisttoplv = -99
            //ѭ�������ҵ����ȼ����
            //ֻ�ұ����� �򱾷��丽����(������ʱû����)
            for (let rolekey in this.createlist) {
                let createrole = this.createlist[rolekey]
                let ckind = createrole["mempar"]["memory"]["ckind"] 
                let rolelv = createrole["lv"]
                this.addlog("_doCreatelist", "_doCreatelist rolelv:" + rolelv, 10, null, spawnname   );
                if (rolelv <= createlisttoplv) continue;
                let createroomname = createrole["mempar"]["memory"]["roleroom"]
                this.addlog("_doCreatelist", "_doCreatelist createroomname:" + createroomname + roomname, 10, createrole["mempar"], spawnname);
                //�����������ж��Ƿ��ڸ������� ����ֻ��������͸��ڷ����
                if (createroomname != roomname) {
                    let nexts = this.getNextRooms(createroomname)
                    this.addlog("_doCreatelist", "_doCreatelist nexts:" + createroomname + roomname, 10, nexts, spawnname);
                    let findnext = false;
                    for (var i = 0; i < nexts.length; i++) {
                        if (nexts[i] == roomname) {
                            if (ckind != "CClaim78") {
                                findnext = true
                                break;
                            }
                            if (ckind == "CClaim78" && Game.rooms[nexts[i]].energyCapacityAvailable >= 650) {
                                findnext = true
                                break;
                            } 
                        }
                        //if (ckind != "CClaim78") {
                            let nextnext = this.getNextRooms(nexts[i])
                            for (var i = 0; i < nextnext.length; i++) {
                                if (nextnext[i] == roomname) {
                                    findnext = true
                                    break;
                                }
                            }
                       // }
                        if (findnext) break;
                    }
                   
                    if (!findnext) continue; 

                }
                   
                createlisttopkey = rolekey
                createlisttoplv=rolelv
            }
            if (!createlisttopkey) {
                nospawn[spawnname] = {
                    spawnname: spawnname
                    , roomname: roomname
                }
                continue
            }
           
            let createrole = this.createlist[createlisttopkey]
            //�ҵ���
            this.addlog("_doCreatelist", "_doCreatelist :" + createlisttopkey, 25, createrole, spawnname);
            this._dospawnCreep(spawn, createrole)

        }

        //����û��� �Ϳ����Ҹ��ڵĸ���
        //if (this.iscanref(this.classname)) {
        //    global.mine9["Spawn78"]["createlist"] = {}
        //}
    }

    /**
     * ִ������
     * */
    _dospawnCreep(spawn: StructureSpawn, createrole: object) {
        this.AddLog("_dospawnCreep init:"  ,20, createrole);
        if (!createrole) return;
        //�ȼ���BODY
        let body = this._getCreepBody(spawn, createrole)
        this.AddLog("_dospawnCreep body:", 20, body);
        if (body.length == 0) return;
        let bodycost = createrole["bodycost"]
        let room = spawn.room;
        this.AddLog("_dospawnCreep :" + bodycost + room.energyAvailable, 20, body);
        if (room.energyAvailable >= bodycost) {
            let creepname = this.getNewid()
            if (createrole["mempar"]["memory"]["creepname"])
                creepname = createrole["mempar"]["memory"]["creepname"] 
           
      

            let tmp = spawn.spawnCreep(body, creepname, createrole["mempar"]);
            if (tmp == 0) {
                if (createrole["callback"]) {
                    createrole["callback"](createrole["rolekey"], creepname, createrole)
                    //this.AddLog("_dospawnCreep callback test :" + createrole["rolekey"], 80);
                }
                //this.roomdatas.creeps[rolekind][creepname] = { name: creepname, id: creep.id }
                //this.roomdatas.creeps[kind][creepname] = { name: creepname, id: creep.id }
            } else {
                this.AddLog("_dospawnCreep do :" + spawn.name + tmp, 50, createrole);
            }
            //if (createrole["callback"])
            //    createrole["callback"]["spawnover"](Game.creeps[creepname]);
            delete this.createlist[createrole["rolekey"]]
      

        }
    }

    /**
     * ���������Զ�����BODY
     * 300 550 800 1300
     * */
    _getCreepBody(spawn: StructureSpawn, createrole: object) {
        if (!createrole) return;
        //����������
        let room = spawn.room;
        let energyCapacityAvailable = room.energyCapacityAvailable;
        let ckind = createrole["mempar"]["memory"]["ckind"] 
        let body = []
        let cost = 0
        let costone;
        let worknum = 0;
        let rolelv   = createrole["lv"]
        switch (ckind) {
            case "CAttSimp":
                costone=90
                for (var i = 0; i < 10; i++) {
                    if (energyCapacityAvailable < costone) break;
                    body.push(TOUGH, TOUGH, TOUGH, TOUGH, MOVE);
              
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                break;
            case "CDef78":
                body.push(TOUGH, TOUGH, TOUGH
                    , TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE );
                cost = 10 * 6 + 50 * 3
                energyCapacityAvailable -= cost;
                costone = 80 * 2 + 50
                for (var i = 0; i < 3; i++) {
                    if (energyCapacityAvailable < costone) break;
                    body.push(ATTACK, ATTACK, MOVE);
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                break;
            case "CClaim78":
                if (rolelv >= 100) {
                    body.push(CLAIM, MOVE);
                    cost=650
                } else {
                    costone = 650;
                    //body.push(CLAIM, MOVE);
                    //energyCapacityAvailable -= 650;
                    for (var i = 0; i < 5; i++) {
                         if (energyCapacityAvailable < costone) break;
                        if (energyCapacityAvailable > costone && energyCapacityAvailable < costone*2) {
                            for (var j = 0; j < 3; j++) {
                                body.push(MOVE);
                                energyCapacityAvailable -= 50;
                                cost += 50;
                                //this.AddLog(energyCapacityAvailable + "_getCreepBody :" + costone, 50, body);
                                if (energyCapacityAvailable <= costone  )
                                    break;
                            }
                            //break;
                        }
                        body.push(CLAIM, MOVE);
                        energyCapacityAvailable -= costone;
                        cost += costone;
                       
                    }
                }
                break;
            case "CWatch78":
                body.push(MOVE);
                cost = 50;
                break;
            case "CStore78":
                costone = 50;
                body.push(MOVE);
                energyCapacityAvailable -= 50;
                for (var i = 0; i < 20; i++) {
                    if (energyCapacityAvailable < costone) break;
                    body.push(CARRY);
                    worknum += 1;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                createrole["mempar"]["memory"]["carrynum"] = worknum;
                break;
            case "CBuild78"://5�����ϼӸ��ֿ�
                costone = 250;
                body.push(CARRY)
                energyCapacityAvailable -= 50;
                cost += 50;  
                for (var i = 0; i < 3; i++) {
                    if (worknum == 6 && energyCapacityAvailable>=50 ) {
                        body.push(CARRY)
                        energyCapacityAvailable -= 50;
                        cost += 50;   
                    }
                    if (energyCapacityAvailable < costone) break;
                    body.push(WORK, WORK, MOVE);
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;                    
                }
                createrole["mempar"]["memory"]["worknum"] = worknum;
                break;
            case "CUp78":
                costone = 250;
                body.push(CARRY)
                energyCapacityAvailable -= 50;
                cost += 50;  
                let maxworknum = createrole["mempar"]["memory"]["maxworknum"]

                for (var i = 0; i < 3; i++) {
                    if (maxworknum < 2) break;
                    if (energyCapacityAvailable < costone) break;
                    body.push(WORK, WORK, MOVE);
                    maxworknum-=2
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                
                }
                createrole["mempar"]["memory"]["worknum"] = worknum;
                break;
            case "CShip78":
            case "CShip782":
                costone = 150;
                if (!this.roomdatas.creeps[ckind]
                    || Object.keys(this.roomdatas.creeps[ckind]).length <= 1) {
                    if (room.energyAvailable >= costone*2)
                        energyCapacityAvailable = room.energyAvailable
                } 
        
             
                if (rolelv >= 100) energyCapacityAvailable = room.energyAvailable
                for (var i = 0; i < 6; i++) {
                    if (energyCapacityAvailable < costone) break;
                    body.push(CARRY, CARRY, MOVE);
                    worknum += 2;
                    energyCapacityAvailable -= costone;
                    cost += costone;
                }
                if (worknum * 50 > this.shipstore)
                    this.shipstore = worknum * 50 
                createrole["mempar"]["memory"]["carrynum"] = worknum;
                break;
            case "COce78":
                costone = 250; 
                //if (  !this.roomdatas.creeps[ckind]
                //    || Object.keys(this.roomdatas.creeps[ckind]).length <= 0) {
                //    if (room.energyAvailable >= costone)
                //        energyCapacityAvailable = room.energyAvailable
                //}         
             
                
                if (rolelv >= 100) energyCapacityAvailable = room.energyAvailable
                for (var i = 0; i < 3; i++) {
                    if (energyCapacityAvailable < costone) {
                        if (i == 1 && energyCapacityAvailable >= 100) {
                            body.push( WORK);
                            worknum += 1;
                            energyCapacityAvailable -= 100;
                            cost += 100;
                        }
                        break;
                    }
                    body.push(MOVE, WORK, WORK);
                    worknum += 2;
                    energyCapacityAvailable -= costone; 
                    cost += costone;
                }
              
                //this.AddLog("_getCreepBody COce78 test :" + rolelv, 40, body);
                //return;
                createrole["mempar"]["memory"]["worknum"] = worknum;
                break;
        }
        createrole["bodycost"] = cost;
        this.AddLog("_getCreepBody :", 10, body);
        return body;
    }

    delplan(rolekey: string) {
        delete this.getGlobalclass()["createlist"][rolekey]
    }

    /**
     * ����½��ƻ�
     * rolekey:Ψһ kind+�Ǹ�kind���Ƶ�Ψһ
     * mempar:���ú�д���ڴ�
     * */
    addplan(rolekey: string, lv: number, mempar: {}, callback: any = null) {//
        this.createlist = this.getGlobalclass()["createlist"]
        this.createlist[rolekey] = {
            rolekey: rolekey, lv: lv, mempar: mempar 
            , callback: callback
        } 
        // 
        this.AddLog("addplan:" + rolekey, 20, this.createlist[rolekey]);
    }
}