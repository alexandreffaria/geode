package handlers

import "net/http"

// pathParam extracts the trailing path segment after the given prefix.
// For example, pathParam(r, "/api/accounts/") returns the account name.
func pathParam(r *http.Request, prefix string) string {
	return r.URL.Path[len(prefix):]
}
