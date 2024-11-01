/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as CosmographImport } from './routes/cosmograph'
import { Route as IndexImport } from './routes/index'

// Create/Update Routes

const CosmographRoute = CosmographImport.update({
  id: '/cosmograph',
  path: '/cosmograph',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/cosmograph': {
      id: '/cosmograph'
      path: '/cosmograph'
      fullPath: '/cosmograph'
      preLoaderRoute: typeof CosmographImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/cosmograph': typeof CosmographRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/cosmograph': typeof CosmographRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/cosmograph': typeof CosmographRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/cosmograph'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/cosmograph'
  id: '__root__' | '/' | '/cosmograph'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  CosmographRoute: typeof CosmographRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  CosmographRoute: CosmographRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.ts",
      "children": [
        "/",
        "/cosmograph"
      ]
    },
    "/": {
      "filePath": "index.ts"
    },
    "/cosmograph": {
      "filePath": "cosmograph.ts"
    }
  }
}
ROUTE_MANIFEST_END */
