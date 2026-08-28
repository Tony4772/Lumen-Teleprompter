package pe.ebyzom.lumen.navigation;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000 \n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0006\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\b6\u0018\u00002\u00020\u0001:\u0003\u0007\b\tB\u000f\b\u0004\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004R\u0011\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\u0005\u0010\u0006\u0082\u0001\u0003\n\u000b\f\u00a8\u0006\r"}, d2 = {"Lpe/ebyzom/lumen/navigation/Screen;", "", "route", "", "(Ljava/lang/String;)V", "getRoute", "()Ljava/lang/String;", "ScriptEditor", "ScriptList", "Teleprompter", "Lpe/ebyzom/lumen/navigation/Screen$ScriptEditor;", "Lpe/ebyzom/lumen/navigation/Screen$ScriptList;", "Lpe/ebyzom/lumen/navigation/Screen$Teleprompter;", "app_debug"})
public abstract class Screen {
    @org.jetbrains.annotations.NotNull
    private final java.lang.String route = null;
    
    private Screen(java.lang.String route) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull
    public final java.lang.String getRoute() {
        return null;
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0018\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\t\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u000e\u0010\u0003\u001a\u00020\u00042\u0006\u0010\u0005\u001a\u00020\u0006\u00a8\u0006\u0007"}, d2 = {"Lpe/ebyzom/lumen/navigation/Screen$ScriptEditor;", "Lpe/ebyzom/lumen/navigation/Screen;", "()V", "createRoute", "", "scriptId", "", "app_debug"})
    public static final class ScriptEditor extends pe.ebyzom.lumen.navigation.Screen {
        @org.jetbrains.annotations.NotNull
        public static final pe.ebyzom.lumen.navigation.Screen.ScriptEditor INSTANCE = null;
        
        private ScriptEditor() {
        }
        
        @org.jetbrains.annotations.NotNull
        public final java.lang.String createRoute(long scriptId) {
            return null;
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lpe/ebyzom/lumen/navigation/Screen$ScriptList;", "Lpe/ebyzom/lumen/navigation/Screen;", "()V", "app_debug"})
    public static final class ScriptList extends pe.ebyzom.lumen.navigation.Screen {
        @org.jetbrains.annotations.NotNull
        public static final pe.ebyzom.lumen.navigation.Screen.ScriptList INSTANCE = null;
        
        private ScriptList() {
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0018\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\t\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u000e\u0010\u0003\u001a\u00020\u00042\u0006\u0010\u0005\u001a\u00020\u0006\u00a8\u0006\u0007"}, d2 = {"Lpe/ebyzom/lumen/navigation/Screen$Teleprompter;", "Lpe/ebyzom/lumen/navigation/Screen;", "()V", "createRoute", "", "scriptId", "", "app_debug"})
    public static final class Teleprompter extends pe.ebyzom.lumen.navigation.Screen {
        @org.jetbrains.annotations.NotNull
        public static final pe.ebyzom.lumen.navigation.Screen.Teleprompter INSTANCE = null;
        
        private Teleprompter() {
        }
        
        @org.jetbrains.annotations.NotNull
        public final java.lang.String createRoute(long scriptId) {
            return null;
        }
    }
}