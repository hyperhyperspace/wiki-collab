import {
    CausalArray,
    ClassRegistry,
    Endpoint,
    Hash,
    HashedObject,
    HashedSet,
    Identity,
    LinkupAddress,
    Lock,
    Logger,
    LogLevel,
    Mesh,
    MeshNode,
    MultiMap,
    MutableContentEvents,
    MutableReference,
    MutationEvent,
    MutationObserver,
    ObjectDiscoveryPeerSource,
    PeerGroupInfo,
    PeerInfo,
    PeerSource,
    SpaceEntryPoint,
    SyncMode,
} from "@hyper-hyper-space/core";
import { PermFlagEveryone, PermFlagMembers, PermFlagModerators, PermFlagOwners } from ".";

import { WikiSpace } from './model/WikiSpace'

export class WikiReadersPeerSource implements PeerSource {
    wiki: WikiSpace;
    constructor(wiki: WikiSpace, parseEndpoint: (ep: Endpoint) => Promise<PeerInfo | undefined>) {
        // super(mesh, wiki, linkupServers, replyAddress, parseEndpoint, timeout)
        this.wiki = wiki;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {
        
        let unique = new Set<Endpoint>();
        let found: PeerInfo[] = []
        let now = Date.now();
        let limit = now + this.timeoutMillis;

        if (this.replyStream === undefined) {
            this.replyStream = this.tryObjectDiscovery(count);;
        } else {
            let reply = this.replyStream.nextIfAvailable();

            while (reply !== undefined && found.length < count) {

                const peerInfo = await this.parseEndpoint(reply.source);
                if (peerInfo !== undefined && !unique.has(peerInfo.endpoint)) {
                    found.push(peerInfo);
                    unique.add(peerInfo.endpoint);
                }

                reply = this.replyStream.nextIfAvailable();
            } 

            if (found.length < count) {
                this.retryObjectDiscovery(count);
            }
        }

        while (found.length < count && now < limit) {
            now = Date.now();

            try {
                const reply = await this.replyStream.next(limit - now)
                const peerInfo = await this.parseEndpoint(reply.source);
                
                if (peerInfo !== undefined && !unique.has(peerInfo.endpoint)) {
                    found.push(peerInfo);
                    unique.add(peerInfo.endpoint);
                }
            } catch(reason) {
                if (reason === 'timeout') {
                    break;
                } else if (reason === 'end') {
                    this.replyStream = this.tryObjectDiscovery(count - found.length);
                    break;
                } else {
                    console.log(reason);
                    // something odd happened TODO: log this
                    break;
                }
            }
        }

        return found;
    }
    
    getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {
        return this.parseEndpoint(endpoint).then(peer => {
            switch (String(this.wiki.permissionLogic?.readConfig)) {
                case PermFlagEveryone:
                    return peer;
                case PermFlagMembers:
                    return peer;
                case PermFlagModerators:
                    return peer;
                case PermFlagOwners:
                    return peer;
                default:
                    return undefined;
            }
        });
    }
}