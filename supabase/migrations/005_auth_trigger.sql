-- 005_auth_trigger.sql

-- Pastikan kita membuat trigger menggunakan skema public eksplisit untuk fungsinya
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
