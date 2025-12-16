import { headers } from 'next/headers';

export function getLocaleFromRequest() {
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  return localeMatch ? localeMatch[1] : 'en';
}

export function createLocalizedResponse(data, locale = 'en', options = {}) {
  const defaultOptions = {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Language': locale,
    },
  };
  
  const responseOptions = { ...defaultOptions, ...options };
  
  // Add localized metadata
  const localizedData = {
    ...data,
    _meta: {
      locale,
      timestamp: new Date().toISOString(),
      ...options.meta,
    },
  };
  
  return new Response(JSON.stringify(localizedData), responseOptions);
}

export function createLocalizedError(message, locale = 'en', statusCode = 500, details = null) {
  const errorMessages = {
    en: {
      validation: 'Validation error',
      authentication: 'Authentication failed',
      authorization: 'Access denied',
      notFound: 'Resource not found',
      server: 'Internal server error',
      network: 'Network error',
      timeout: 'Request timeout',
      rateLimit: 'Too many requests',
      conflict: 'Conflict with existing data',
      default: 'An error occurred',
    },
    es: {
      validation: 'Error de validación',
      authentication: 'Autenticación fallida',
      authorization: 'Acceso denegado',
      notFound: 'Recurso no encontrado',
      server: 'Error interno del servidor',
      network: 'Error de red',
      timeout: 'Tiempo de espera agotado',
      rateLimit: 'Demasiadas solicitudes',
      conflict: 'Conflicto con datos existentes',
      default: 'Ocurrió un error',
    },
    fr: {
      validation: 'Erreur de validation',
      authentication: 'Échec de l\'authentification',
      authorization: 'Accès refusé',
      notFound: 'Ressource non trouvée',
      server: 'Erreur interne du serveur',
      network: 'Erreur réseau',
      timeout: 'Délai d\'attente dépassé',
      rateLimit: 'Trop de requêtes',
      conflict: 'Conflit avec les données existantes',
      default: 'Une erreur est survenue',
    },
    de: {
      validation: 'Validierungsfehler',
      authentication: 'Authentifizierung fehlgeschlagen',
      authorization: 'Zugriff verweigert',
      notFound: 'Ressource nicht gefunden',
      server: 'Interner Serverfehler',
      network: 'Netzwerkfehler',
      timeout: 'Zeitüberschreitung',
      rateLimit: 'Zu viele Anfragen',
      conflict: 'Konflikt mit vorhandenen Daten',
      default: 'Ein Fehler ist aufgetreten',
    },
    zh: {
      validation: '验证错误',
      authentication: '身份验证失败',
      authorization: '访问被拒绝',
      notFound: '资源未找到',
      server: '内部服务器错误',
      network: '网络错误',
      timeout: '请求超时',
      rateLimit: '请求过多',
      conflict: '与现有数据冲突',
      default: '发生错误',
    },
    ja: {
      validation: '検証エラー',
      authentication: '認証に失敗しました',
      authorization: 'アクセスが拒否されました',
      notFound: 'リソースが見つかりません',
      server: '内部サーバーエラー',
      network: 'ネットワークエラー',
      timeout: 'リクエストタイムアウト',
      rateLimit: 'リクエストが多すぎます',
      conflict: '既存のデータと競合しています',
      default: 'エラーが発生しました',
    },
    ar: {
      validation: 'خطأ في التحقق',
      authentication: 'فشل المصادقة',
      authorization: 'الوصول مرفوض',
      notFound: 'المورد غير موجود',
      server: 'خطأ في الخادم الداخلي',
      network: 'خطأ في الشبكة',
      timeout: 'انتهت مهلة الطلب',
      rateLimit: 'طلبات كثيرة جدًا',
      conflict: 'تعارض مع البيانات الموجودة',
      default: 'حدث خطأ',
    },
    hi: {
      validation: 'सत्यापन त्रुटि',
      authentication: 'प्रमाणीकरण विफल',
      authorization: 'पहुंच अस्वीकृत',
      notFound: 'संसाधन नहीं मिला',
      server: 'आंतरिक सर्वर त्रुटि',
      network: 'नेटवर्क त्रुटि',
      timeout: 'अनुरोध समय समाप्त',
      rateLimit: 'बहुत सारे अनुरोध',
      conflict: 'मौजूदा डेटा के साथ विरोध',
      default: 'एक त्रुटि हुई',
    },
  };

  const localizedMessages = errorMessages[locale] || errorMessages.en;
  const errorMessage = localizedMessages[message] || localizedMessages.default;

  return createLocalizedResponse(
    {
      error: true,
      message: errorMessage,
      details,
    },
    locale,
    { status: statusCode }
  );
}

export function getLocalizedSuccessMessage(action, locale = 'en') {
  const successMessages = {
    en: {
      create: 'Created successfully',
      update: 'Updated successfully',
      delete: 'Deleted successfully',
      book: 'Booked successfully',
      cancel: 'Cancelled successfully',
      payment: 'Payment processed successfully',
    },
    es: {
      create: 'Creado exitosamente',
      update: 'Actualizado exitosamente',
      delete: 'Eliminado exitosamente',
      book: 'Reservado exitosamente',
      cancel: 'Cancelado exitosamente',
      payment: 'Pago procesado exitosamente',
    },
    fr: {
      create: 'Créé avec succès',
      update: 'Mis à jour avec succès',
      delete: 'Supprimé avec succès',
      book: 'Réservé avec succès',
      cancel: 'Annulé avec succès',
      payment: 'Paiement traité avec succès',
    },
    de: {
      create: 'Erfolgreich erstellt',
      update: 'Erfolgreich aktualisiert',
      delete: 'Erfolgreich gelöscht',
      book: 'Erfolgreich gebucht',
      cancel: 'Erfolgreich storniert',
      payment: 'Zahlung erfolgreich verarbeitet',
    },
    zh: {
      create: '创建成功',
      update: '更新成功',
      delete: '删除成功',
      book: '预订成功',
      cancel: '取消成功',
      payment: '支付处理成功',
    },
    ja: {
      create: '正常に作成されました',
      update: '正常に更新されました',
      delete: '正常に削除されました',
      book: '正常に予約されました',
      cancel: '正常にキャンセルされました',
      payment: '支払いが正常に処理されました',
    },
    ar: {
      create: 'تم الإنشاء بنجاح',
      update: 'تم التحديث بنجاح',
      delete: 'تم الحذف بنجاح',
      book: 'تم الحجز بنجاح',
      cancel: 'تم الإلغاء بنجاح',
      payment: 'تم معالجة الدفعة بنجاح',
    },
    hi: {
      create: 'सफलतापूर्वक बनाया गया',
      update: 'सफलतापूर्वक अपडेट किया गया',
      delete: 'सफलतापूर्वक हटाया गया',
      book: 'सफलतापूर्वक बुक किया गया',
      cancel: 'सफलतापूर्वक रद्द किया गया',
      payment: 'भुगतान सफलतापूर्वक संसाधित हुआ',
    },
  };

  const messages = successMessages[locale] || successMessages.en;
  return messages[action] || 'Operation successful';
}