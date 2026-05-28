const getAuthToken = (): string | null => {
    try {
      const authData = localStorage.getItem('sb-chshfxzxdtdyyzcnnusr-auth-token');
        if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.access_token;
      }
    } catch (error) {}
    return null;
  };

export default getAuthToken;