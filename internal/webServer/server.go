package webServer

import (
	"encoding/json"
	"fmt"
	"log"
	"movie-graph/internal/graph"
	"net/http"
)

var server *http.Server
var shutdownChan chan struct{}

func StartServer(port int, serverGraph *graph.Graph) chan struct{} {
	shutdownChan = make(chan struct{})
	router := http.NewServeMux()

	router.HandleFunc("/node", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		startNode := r.URL.Query().Get("startNode")
		if startNode == "" {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("startNode parameter is required"))
			return
		}

		depthStr := r.URL.Query().Get("depth")
		if depthStr == "" {
			w.WriteHeader(http.StatusBadRequest) 
			w.Write([]byte("depth parameter is required"))
			return
		}

		var depth int
		if _, err := fmt.Sscanf(depthStr, "%d", &depth); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("depth must be an integer"))
			return
		}

		searchNode, ok := serverGraph.Index[startNode]
		if !ok {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("startNode not found"))
			return
		}	
		vertices, edges := graph.GetNodeAndNeighborsToNDepth(serverGraph, searchNode, depth)
		//return vertices and edges as json
		json.NewEncoder(w).Encode(map[string]interface{}{
			"vertices": vertices,
			"edges": edges,
		})

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf("startNode: %s, depth: %d", startNode, depth)))
	})
	router.HandleFunc("/node", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("pong"))
	})
	
	server = &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: router,
	}

	go func() {
		log.Printf("Starting server on port %d (Press 'q' to stop)\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v\n", err)
		}
		close(shutdownChan)
	}()

	return shutdownChan
}

func StopServer() error {
	if server != nil {
		return server.Close()
	}
	return nil
}
